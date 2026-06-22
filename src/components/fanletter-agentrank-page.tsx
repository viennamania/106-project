import type { CSSProperties, ReactNode } from "react";
import {
  ArrowRight,
  AtSign,
  BadgeCheck,
  Bot,
  Brain,
  Coins,
  Database,
  Download,
  Eye,
  Fingerprint,
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

import type { AgentRankCoverageSnapshot } from "@/lib/agentrank/coverage";
import type { AgentRankBackfillReadinessSnapshot } from "@/lib/agentrank/backfill-readiness";
import { getAgentRankEventTypeLabel } from "@/lib/agentrank/event-labels";
import type { AgentRankInteractionSource } from "@/lib/agentrank/interaction-events";
import { FanletterActionGuide } from "@/components/fanletter-action-guide";
import { FanletterAgentRankTracker } from "@/components/fanletter-agentrank-tracker";
import { FanletterTrackedLink } from "@/components/fanletter-tracked-link";
import type {
  AgentRankEconomicReputationScore,
  AgentRankErsComponent,
  FanletterAgentRankInvestorSnapshot,
} from "@/lib/agentrank/ers";
import type {
  AgentRankReputationEvent,
  FanletterAgentRankReputationEventFeed,
} from "@/lib/agentrank/reputation-events";
import type {
  AgentRankScoreAggregate,
  AgentRankScoreDimensionKey,
} from "@/lib/agentrank/score";
import type { Locale } from "@/lib/i18n";

type AgentRankCopy = ReturnType<typeof getAgentRankCopy>;

const componentIconMap = {
  a2aUsage: Bot,
  lineageTrust: GitBranch,
  retention: Orbit,
  revenue: Coins,
  riskPenalty: ShieldAlert,
  uniqueCustomers: Users,
} satisfies Record<AgentRankErsComponent["key"], typeof Coins>;

const eventIconMap = {
  ai_star_discovered: Eye,
  ai_star_spawned: Rocket,
  content_engaged: Heart,
  content_published: BadgeCheck,
  content_publish_failed: ShieldAlert,
  cp_earned: Coins,
  cp_pool_generated: Database,
  creator_unlock_evaluated: BadgeCheck,
  creator_unlocked: Sparkles,
  creator_social_connected: AtSign,
  creator_social_disconnected: AtSign,
  founder_joined: Users,
  referral_code_created: Network,
  referral_shared: Network,
  referral_converted: GitBranch,
  source_universe_selected: ShieldCheck,
  universe_growth: Orbit,
  x402_mock_payment_intent: WalletCards,
} satisfies Record<AgentRankReputationEvent["type"], typeof Eye>;

const scoreDimensionIconMap = {
  creator: Rocket,
  discovery: Eye,
  economic: Coins,
  network: Network,
  riskPenalty: ShieldAlert,
  trust: ShieldCheck,
} satisfies Record<AgentRankScoreDimensionKey, typeof Coins>;

function getAgentRankCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      a2a: "A2A",
      agentRank: "AgentRank",
      agentRankBody:
        "AI Agent 간 신뢰를 점수화하는 Economic Reputation Network입니다.",
      agentRankCta: "Rank · Score · Predict · Empower",
      agentRankTrustLine:
        "AgentRank는 경제 활동을 사용해 AI Agent의 신뢰를 측정합니다.",
      agentTransactionGraph: "Agent Transaction Graph",
      agentStack: "AI Agent Trust Stack",
      cleanEvents: "Clean Economic Events",
      collectVerify: "Collect · Verify · Enrich · Store · Connect",
      coverage: {
        api: "Coverage API",
        auditPage: "감사 페이지",
        backfillReadiness: "Backfill 준비도",
        contractCoverage: "Contract 유효성",
        csv: "Coverage CSV",
        covered: "수집됨",
        eventCoverage: "이벤트 타입 커버리지",
        gaps: "우선 보강 신호",
        interactionCoverage: "CTA 소스 커버리지",
        missing: "대기",
        oracleCoverage: "오라클 준비율",
        phase1Quality: "Phase 1 데이터 품질",
        schemaCoverage: "AgentRank 스키마 준비율",
        subtitle:
          "FanLetter 행동이 AgentRank 평판 기록으로 얼마나 안정적으로 쌓이는지 점검합니다.",
        title: "AgentRank Event Quality",
      },
      dataLayer: "MiZi 데이터/검증 레이어",
      economicActivity: "평판은 경제 활동에서 만들어집니다",
      ers: "Economic Reputation Score",
      eventFactory: "Reputation Event Factory",
      eventFactoryBody:
        "FanLetter의 발견, 참여, 초대, 창업, CP 보상이 AgentRank 기록의 원천이 됩니다.",
      eventTimeline: "최근 평판 기록",
      fanletter: "FanLetter",
      fanletterBody:
        "AI 스타 발견과 파운더 네트워크로 소비자 행동 데이터를 생성합니다.",
      formula: "ERS 계산식",
      generated: "Live AgentRank preview",
      googleProblem: "Google은 링크 그래프를 신뢰로 바꿨습니다.",
      googleTrustLine: "Google은 링크를 사용해 웹 신뢰를 측정했습니다.",
      heroBody:
        "FanLetter는 최종 제품이 아니라 AgentRank의 Phase 1입니다. AI 스타와 파운더 네트워크에서 발생하는 경제적 행동을 평판 기록으로 수집해 AgentRank로 확장합니다.",
      heroTitle: "From PageRank to AgentRank",
      heroSubtitle: "AI Agent 경제를 위한 Trust Infrastructure",
      mizi: "MiZi",
      miziBody:
        "이벤트를 정제하고 x402, A2A, 오라클 검증 가능한 경제 이벤트로 전환합니다.",
      miziEquals: "MiZi = PeopleGPT",
      miziPeople:
        "AI 경제를 위한 People Search Engine입니다. 사람, 크리에이터, AI Agent의 검증된 기록을 연결합니다.",
      pageRank: "PageRank",
      productPath: "FanLetter → MiZi (PeopleGPT) → AgentRank",
      reputationInfrastructure: "Reputation Infrastructure",
      roadmap: "장기 로드맵",
      score: "AgentRank Score",
      scoreAggregator: "AgentRank Score Aggregator",
      scoreAggregatorBody:
        "평판 기록을 파운더 네트워크, 경제 활동, 크리에이터 여정, AI 스타 발견, 리니지 신뢰, 감사 품질 차원으로 집계합니다.",
      scoreConfidence: "집계 신뢰도",
      scoreScopeCoverage: "커버리지 포함 점수",
      scoreScopeMockExcluded: "미리보기 이벤트 제외",
      scoreScopeOperational: "운영 점수",
      scoreCsv: "Score CSV",
      oraclePacket: "Oracle Packet",
      oracleEvidence: "Oracle Evidence Chain",
      oracleEvidenceBody:
        "AgentRank Oracle Packet에 포함되는 이벤트 증거 해시, 감사 상태, 스키마 준비도를 체인으로 보여줍니다.",
      quickLedger: "원장 빠른 검증",
      ledgerCreatorSocial: "TikTok 연결",
      ledgerHighImpact: "고기여 이벤트",
      ledgerNeedsOracle: "오라클 보강",
      ledgerOracleReady: "오라클 준비",
      reviewQueue: "Review Queue",
      evidenceHash: "증거 해시",
      evidenceEvents: "증거 이벤트",
      trustLayerMissing: "AI Agent 경제에는 Trust Layer가 필요합니다.",
      topContributors: "상위 기여자",
      useCases: "Use Cases",
      viewEventsApi: "평판 기록 보기",
      viewFounderUniverse: "파운더 네트워크",
      viewHome: "FanLetter 홈",
      whyMatters:
        "PageRank가 웹 링크를 신뢰로 바꾼 것처럼, AgentRank는 AI Agent의 경제 활동을 신뢰로 바꿉니다.",
      x402: "x402",
      x402Pending: "x402 결제 연결 예정",
      bottomStatements: [
        "Google organized the world's information.",
        "PeopleGPT organizes the world's trust.",
        "AgentRank measures economic reputation.",
      ],
      futureBuild: "우리가 만드는 미래",
      metrics: {
        audit: "감사 준비",
        cp: "CP 보상",
        cpPool: "CP 풀",
        events: "평판 기록",
        members: "멤버",
        network: "네트워크 연결",
        oracle: "오라클 준비",
        quality: "이벤트 품질",
        stars: "AI 스타",
      },
    };
  }

  return {
    a2a: "A2A",
    agentRank: "AgentRank",
    agentRankBody:
      "The Economic Reputation Network that scores trust between AI Agents.",
    agentRankCta: "Rank · Score · Predict · Empower",
    agentRankTrustLine:
      "AgentRank uses economic activity to measure AI Agent trust.",
    agentTransactionGraph: "Agent Transaction Graph",
    agentStack: "AI Agent Trust Stack",
    cleanEvents: "Clean Economic Events",
    collectVerify: "Collect · Verify · Enrich · Store · Connect",
    coverage: {
      api: "Coverage API",
      auditPage: "Audit Page",
      backfillReadiness: "Backfill Readiness",
      contractCoverage: "Contract Validity",
      csv: "Coverage CSV",
      covered: "Covered",
      eventCoverage: "Event Type Coverage",
      gaps: "Priority Gaps",
      interactionCoverage: "CTA Source Coverage",
      missing: "Pending",
      oracleCoverage: "Oracle-ready Coverage",
      phase1Quality: "Phase 1 Data Quality",
      schemaCoverage: "AgentRank Schema Coverage",
      subtitle:
        "Checks how reliably FanLetter actions are becoming AgentRank reputation events.",
      title: "AgentRank Event Quality",
    },
    dataLayer: "MiZi Data & Verification Layer",
    economicActivity: "Reputation is built from economic activity",
    ers: "Economic Reputation Score",
    eventFactory: "Reputation Event Factory",
    eventFactoryBody:
      "Discovery, joins, invites, creator launches, and CP rewards become AgentRank event sources.",
    eventTimeline: "Latest reputation records",
    fanletter: "FanLetter",
    fanletterBody:
      "Generates consumer behavior data through AI Star Discovery and Founder Network activity.",
    formula: "ERS Formula",
    generated: "Live AgentRank preview",
    googleProblem: "Google transformed link graphs into trust.",
    googleTrustLine: "Google used links to measure web trust.",
    heroBody:
      "FanLetter is not the final product. It is Phase 1 of AgentRank. AI Star and Founder Network actions become reputation events that compound into the AgentRank trust layer.",
    heroTitle: "From PageRank to AgentRank",
    heroSubtitle: "Building the Trust Infrastructure for the AI Agent Economy",
    mizi: "MiZi",
    miziBody:
      "Cleans, verifies, and enriches events into x402, A2A, and oracle-ready economic signals.",
    miziEquals: "MiZi = PeopleGPT",
    miziPeople:
      "The People Search Engine for the AI Economy. It connects verified records for people, creators, and AI Agents.",
    pageRank: "PageRank",
    productPath: "FanLetter → MiZi (PeopleGPT) → AgentRank",
    reputationInfrastructure: "Reputation Infrastructure",
    roadmap: "Long-term Roadmap",
    score: "AgentRank Score",
    scoreAggregator: "AgentRank Score Aggregator",
    scoreAggregatorBody:
      "Aggregates Reputation Events into Founder Network, Economic Activity, Creator Journey, AI Star Discovery, Lineage Trust, and audit quality.",
    scoreConfidence: "Score Confidence",
    scoreScopeCoverage: "Coverage-including score",
    scoreScopeMockExcluded: "Mock events excluded",
    scoreScopeOperational: "Operational Score",
    scoreCsv: "Score CSV",
    oraclePacket: "Oracle Packet",
    oracleEvidence: "Oracle Evidence Chain",
    oracleEvidenceBody:
      "Visualizes the event evidence hashes, audit state, and schema readiness included in the AgentRank Oracle Packet.",
    quickLedger: "Quick Ledger Review",
    ledgerCreatorSocial: "TikTok Connections",
    ledgerHighImpact: "High-impact Events",
    ledgerNeedsOracle: "Oracle Gaps",
    ledgerOracleReady: "Oracle-ready",
    reviewQueue: "Review Queue",
    evidenceHash: "Evidence Hash",
    evidenceEvents: "Evidence Events",
    trustLayerMissing: "The AI Agent economy needs a trust layer.",
    topContributors: "Top Contributors",
    useCases: "Use Cases",
    viewEventsApi: "View reputation records",
    viewFounderUniverse: "Founder Network",
    viewHome: "FanLetter Home",
    whyMatters:
      "PageRank indexed web links. AgentRank indexes economic trust between AI Agents.",
    x402: "x402",
    x402Pending: "x402 payment integration pending",
    bottomStatements: [
      "Google organized the world's information.",
      "PeopleGPT organizes the world's trust.",
      "AgentRank measures economic reputation.",
    ],
    futureBuild: "The Future We Build",
    metrics: {
      audit: "Audit Ready",
      cp: "CP Rewards",
      cpPool: "CP Pool",
      events: "Records",
      members: "Members",
      network: "Network Edges",
      oracle: "Oracle Ready",
      quality: "Event Quality",
      stars: "AI Stars",
    },
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
  return getAgentRankEventTypeLabel(type, locale);
}

function getEventSourceLabel(
  source: AgentRankReputationEvent["source"],
  locale: Locale,
) {
  if (locale !== "ko") {
    const labels: Record<AgentRankReputationEvent["source"], string> = {
      fanletter_funnel_event: "FanLetter Interaction",
      fanletter_star: "AI Star Registry",
      fanletter_star_founder_membership: "Founder Network",
      fanletter_star_influence_ledger: "CP Ledger",
      fanletter_star_referral_code: "Referral Code",
      fanletter_star_referral_edge: "Referral Graph",
    };

    return labels[source];
  }

  const labels: Record<AgentRankReputationEvent["source"], string> = {
    fanletter_funnel_event: "FanLetter 행동 신호",
    fanletter_star: "AI 스타 레지스트리",
    fanletter_star_founder_membership: "파운더 네트워크",
    fanletter_star_influence_ledger: "CP 원장",
    fanletter_star_referral_code: "추천 코드",
    fanletter_star_referral_edge: "추천 그래프",
  };

  return labels[source];
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
          fanletter_creator_unlock: "권한 활성화",
          fanletter_founder_universe: "파운더 네트워크",
          fanletter_home: "FanLetter 홈",
          fanletter_my_ai: "내 AI",
          fanletter_news: "뉴스/리포트",
          fanletter_star_detail: "AI 스타 상세",
        }
      : {
          fanletter_agentrank: "AgentRank Page",
          fanletter_bridge: "Connect / Onboarding",
          fanletter_content: "Content / Vlog",
          fanletter_creator_unlock: "Creator Permission",
          fanletter_founder_universe: "Founder Network",
          fanletter_home: "FanLetter Home",
          fanletter_my_ai: "My AI",
          fanletter_news: "News / Reports",
          fanletter_star_detail: "AI Star Detail",
        };

  return labels[source];
}

function getFactoryLayerLabel(
  layer: AgentRankCoverageSnapshot["factoryManifest"]["layers"][number]["layer"],
  locale: Locale,
) {
  if (locale !== "ko") {
    return layer;
  }

  const labels: Record<
    AgentRankCoverageSnapshot["factoryManifest"]["layers"][number]["layer"],
    string
  > = {
    creator: "크리에이터",
    discovery: "발견",
    economy: "경제",
    network: "네트워크",
  };

  return labels[layer];
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

type AgentRankCoverageGapAction = {
  coverageAction: string;
  description: string;
  eventType: AgentRankReputationEvent["type"];
  href: string;
  key: string;
  label: string;
  trigger: string;
};

function buildCoverageActionQuery({
  coverageAction,
  starId,
}: {
  coverageAction: string;
  starId?: string | null;
}) {
  const params = new URLSearchParams({
    coverageAction,
    limit: "120",
  });

  if (starId) {
    params.set("starId", starId);
  }

  return params.toString();
}

function getCoverageGapAction({
  gap,
  locale,
  starId,
}: {
  gap: string;
  locale: Locale;
  starId?: string | null;
}): AgentRankCoverageGapAction {
  const [kind, value] = gap.split(":");
  const isKorean = locale === "ko";
  const action = value || kind || gap;
  const query = buildCoverageActionQuery({
    coverageAction: action,
    starId,
  });
  const starDetailHref = starId
    ? `/${locale}/fanletter/${encodeURIComponent(starId)}?${query}#referral-builder`
    : `/${locale}/fanletter/characters?${query}`;
  const creatorHref = `/${locale}/fanletter/creator-unlock?${query}`;

  if (kind === "missing_event") {
    const eventType = value as AgentRankReputationEvent["type"];
    const creatorEventActions: Partial<
      Record<
        AgentRankReputationEvent["type"],
        {
          anchor?: string;
          description: string;
          trigger: string;
        }
      >
    > = {
      ai_star_spawned: {
        anchor: "mock-launch-panel",
        description: isKorean
          ? "AI 스타 생성 미리보기에서 창업 출처와 10 USDT 생성 의도를 함께 기록합니다."
          : "Use the AI Star launch preview to record source selection and mock 10 USDT intent.",
        trigger: isKorean ? "AI 스타 생성 미리보기" : "AI Star launch preview",
      },
      creator_social_connected: {
        anchor: "tiktok-channel",
        description: isKorean
          ? "AI 스타별 TikTok 채널 연결을 기록해 크리에이터 여정 신호를 채웁니다."
          : "Mock-connect the AI Star TikTok channel to fill the Creator Journey signal.",
        trigger: isKorean ? "TikTok 채널 연결" : "Connect TikTok channel",
      },
      creator_unlock_evaluated: {
        anchor: "creator-unlock-conditions",
        description: isKorean
          ? "크리에이터 권한 활성화 조건 평가를 기록해 다음 창업 가능성을 보여줍니다."
          : "Record creator permission evaluation so the next launch path is visible.",
        trigger: isKorean ? "권한 조건 평가" : "Evaluate creator permissions",
      },
      creator_unlocked: {
        anchor: "creator-unlock-conditions",
        description: isKorean
          ? "조건 충족 상태를 확인하고 크리에이터 권한 활성화 기록을 수집합니다."
          : "Confirm eligibility and collect the creator permission activation event.",
        trigger: isKorean ? "크리에이터 권한 활성화" : "Activate creator permissions",
      },
      source_universe_selected: {
        anchor: "source-universe-picker",
        description: isKorean
          ? "새 AI 스타가 어느 AI 스타 유니버스 성과에서 탄생하는지 출처를 고정합니다."
          : "Choose which AI Star Universe produced the new AI Star launch outcome.",
        trigger: isKorean ? "출처 AI 스타 유니버스 선택" : "Select source AI Star Universe",
      },
      x402_mock_payment_intent: {
        anchor: "mock-launch-panel",
        description: isKorean
          ? "실결제 없이 10 USDT 창업 의도와 CP 풀 생성 흐름을 미리보기로 기록합니다."
          : "Record mock 10 USDT launch intent and CP Pool flow without real payment.",
        trigger: isKorean ? "미리보기 결제 의도 기록" : "Record mock payment intent",
      },
    };
    const creatorAction = creatorEventActions[eventType];

    if (creatorAction) {
      return {
        coverageAction: action,
        description: creatorAction.description,
        eventType,
        href: `${creatorHref}${creatorAction.anchor ? `#${creatorAction.anchor}` : ""}`,
        key: gap,
        label: getCoverageGapLabel(gap, locale),
        trigger: creatorAction.trigger,
      };
    }

    if (eventType === "referral_shared") {
      return {
        coverageAction: action,
        description: isKorean
          ? "AI 스타 상세에서 추천 링크를 공유하면 파운더 네트워크와 크리에이터 여정이 동시에 갱신됩니다."
          : "Share a referral link from the AI Star detail page to update Founder Network and Creator Journey signals.",
        eventType,
        href: starDetailHref,
        key: gap,
        label: getCoverageGapLabel(gap, locale),
        trigger: isKorean ? "추천 링크 공유" : "Share referral link",
      };
    }

    return {
      coverageAction: action,
      description: isKorean
        ? "해당 이벤트가 발생하는 제품 화면으로 이동해 평판 기록을 수집합니다."
        : "Open the product surface that can create this reputation event.",
      eventType,
      href: starDetailHref,
      key: gap,
      label: getCoverageGapLabel(gap, locale),
      trigger: getEventTypeLabel(eventType, locale),
    };
  }

  if (kind === "missing_source") {
    const source = value as AgentRankInteractionSource;
    const sourceHref: Partial<Record<AgentRankInteractionSource, string>> = {
      fanletter_agentrank: `/${locale}/fanletter/agentrank?${query}`,
      fanletter_bridge: `/${locale}/fanletter/connect?${query}`,
      fanletter_content: `/${locale}/fanletter/news/vlogs?${query}`,
      fanletter_creator_unlock: creatorHref,
      fanletter_founder_universe: starId
        ? `/${locale}/fanletter/${encodeURIComponent(starId)}/universe?${query}`
        : `/${locale}/fanletter?${query}#founder-network`,
      fanletter_home: `/${locale}/fanletter?${query}`,
      fanletter_news: `/${locale}/fanletter/news?${query}`,
      fanletter_star_detail: starDetailHref,
    };

    return {
      coverageAction: action,
      description: isKorean
        ? "이 CTA 출처에서 사용자 행동이 AgentRank 평판 기록으로 남는지 확인합니다."
        : "Verify that this CTA source is producing AgentRank reputation records.",
      eventType: "content_engaged",
      href: sourceHref[source] ?? `/${locale}/fanletter/agentrank?${query}`,
      key: gap,
      label: getCoverageGapLabel(gap, locale),
      trigger: getInteractionSourceLabel(source, locale),
    };
  }

  if (gap === "pending:x402_economy") {
    const x402Query = buildCoverageActionQuery({
      coverageAction: "x402_economy",
      starId,
    });

    return {
      coverageAction: "x402_economy",
      description: isKorean
        ? "실제 결제 전까지 미리보기 결제 의도와 CP 풀 생성 신호를 먼저 수집합니다."
        : "Collect mock payment intent and CP Pool signals before real payment integration.",
      eventType: "x402_mock_payment_intent",
      href: `/${locale}/fanletter/creator-unlock?${x402Query}#mock-launch-panel`,
      key: gap,
      label: getCoverageGapLabel(gap, locale),
      trigger: isKorean ? "미리보기 결제 의도" : "Mock payment intent",
    };
  }

  if (gap === "pending:a2a_usage") {
    const a2aQuery = buildCoverageActionQuery({
      coverageAction: "a2a_usage",
      starId,
    });

    return {
      coverageAction: "a2a_usage",
      description: isKorean
        ? "Phase 1에서는 Agent 호출 이벤트 스키마 연결 전까지 원장 검증 항목으로 유지합니다."
        : "Keep this as a ledger review item until Agent call event schema is connected.",
      eventType: "content_engaged",
      href: `/${locale}/fanletter/agentrank/events?${a2aQuery}`,
      key: gap,
      label: getCoverageGapLabel(gap, locale),
      trigger: isKorean ? "Agent 호출 준비" : "Agent call readiness",
    };
  }

  return {
    coverageAction: action,
    description: isKorean
      ? "이 갭을 채울 수 있는 제품 흐름과 이벤트 스키마를 확인합니다."
      : "Review the product flow and event schema needed to fill this gap.",
    eventType: "content_engaged",
    href: `/${locale}/fanletter/agentrank?${query}`,
    key: gap,
    label: getCoverageGapLabel(gap, locale),
    trigger: gap,
  };
}

function getScoreDimensionLabel(
  key: AgentRankScoreDimensionKey,
  locale: Locale,
) {
  const labels: Record<AgentRankScoreDimensionKey, string> =
    locale === "ko"
      ? {
          creator: "크리에이터 여정",
          discovery: "AI 스타 발견",
          economic: "경제 활동",
          network: "파운더 네트워크",
          riskPenalty: "위험 패널티",
          trust: "리니지 신뢰",
        }
      : {
          creator: "Creator Journey",
          discovery: "AI Star Discovery",
          economic: "Economic Activity",
          network: "Founder Network",
          riskPenalty: "Risk Penalty",
          trust: "Lineage Trust",
        };

  return labels[key];
}

function MetricTile({
  label,
  style,
  value,
}: {
  label: string;
  style?: CSSProperties;
  value: string;
}) {
  return (
    <div
      className="agentrank-flow-card rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-[0_18px_44px_rgba(15,23,42,0.06)]"
      style={style}
    >
      <p className="text-[0.68rem] font-semibold uppercase text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-[#11132d]">{value}</p>
    </div>
  );
}

function MiniConnectionGraph({
  variant,
}: {
  variant: "agent" | "web";
}) {
  const nodes = [
    { left: "10%", top: "48%" },
    { left: "30%", top: "25%" },
    { left: "46%", top: "55%" },
    { left: "66%", top: "28%" },
    { left: "80%", top: "62%" },
  ];
  const lines = [
    { left: "17%", top: "47%", rotate: -26, width: "28%" },
    { left: "36%", top: "38%", rotate: 34, width: "26%" },
    { left: "54%", top: "43%", rotate: -28, width: "26%" },
    { left: "56%", top: "63%", rotate: 8, width: "30%" },
    { left: "23%", top: "61%", rotate: -6, width: "34%" },
  ];
  const isWeb = variant === "web";
  const nodeClass = isWeb
    ? "bg-blue-600 text-white ring-blue-100"
    : "bg-zinc-900 text-white ring-zinc-200";
  const lineClass = isWeb ? "bg-blue-300/80" : "bg-zinc-300/80";

  return (
    <div className="relative h-36 overflow-hidden rounded-lg border border-slate-100 bg-white">
      {lines.map((line, index) => (
        <span
          className={`agentrank-graph-line absolute h-0.5 rounded-full ${lineClass}`}
          key={`${line.left}-${line.top}-${index}`}
          style={{
            animationDelay: `${index * 160}ms`,
            left: line.left,
            top: line.top,
            transform: `rotate(${line.rotate}deg)`,
            width: line.width,
          }}
        />
      ))}
      {nodes.map((node, index) => (
        <span
          className={`agentrank-graph-node absolute flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-semibold ring-8 ${nodeClass}`}
          key={`${node.left}-${node.top}-${index}`}
          style={{
            animationDelay: `${index * 180}ms`,
            left: node.left,
            top: node.top,
          }}
        >
          {isWeb ? index + 1 : <Bot className="size-4" />}
        </span>
      ))}
      <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
        {isWeb ? "Web Link Graph" : "Agent Transaction Graph"}
      </span>
    </div>
  );
}

function IconMiniTile({
  icon,
  label,
  tone = "violet",
}: {
  icon: ReactNode;
  label: string;
  tone?: "blue" | "emerald" | "pink" | "violet";
}) {
  const toneClass = {
    blue: "border-blue-100 bg-blue-50/70 text-blue-700",
    emerald: "border-emerald-100 bg-emerald-50/70 text-emerald-700",
    pink: "border-pink-100 bg-pink-50/70 text-pink-700",
    violet: "border-zinc-200 bg-zinc-50 text-zinc-700",
  }[tone];

  return (
    <div
      className={`agentrank-flow-card min-w-0 rounded-lg border px-3 py-3 text-center ${toneClass}`}
    >
      <div className="mx-auto flex size-9 items-center justify-center rounded-lg bg-white shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
        {icon}
      </div>
      <p className="mt-2 text-xs font-semibold leading-4 text-[#11132d]">
        {label}
      </p>
    </div>
  );
}

function CoverageProgress({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#11132d]">{label}</p>
        <p className="text-2xl font-semibold text-zinc-950">{value}%</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100">
        <div
          className="agentrank-score-bar h-full rounded-full bg-gradient-to-r from-black via-zinc-700 to-zinc-400"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function AgentRankCoveragePanel({
  backfill,
  copy,
  coverage,
  locale,
  starId,
}: {
  backfill: AgentRankBackfillReadinessSnapshot;
  copy: AgentRankCopy;
  coverage: AgentRankCoverageSnapshot;
  locale: Locale;
  starId?: string | null;
}) {
  const coverageParams = new URLSearchParams({
    limit: "120",
  });
  const coveragePageParams = new URLSearchParams(coverageParams);
  const coverageCsvParams = new URLSearchParams(coverageParams);
  const layerClass = {
    creator: "border-pink-100 bg-pink-50/70 text-pink-700",
    discovery: "border-blue-100 bg-blue-50/70 text-blue-700",
    economy: "border-emerald-100 bg-emerald-50/70 text-emerald-700",
    network: "border-zinc-200 bg-zinc-50 text-zinc-700",
  } satisfies Record<
    AgentRankCoverageSnapshot["eventTypes"][number]["layer"],
    string
  >;
  const criticalEventTypes = [
    "ai_star_discovered",
    "founder_joined",
    "referral_shared",
    "creator_unlocked",
    "x402_mock_payment_intent",
    "ai_star_spawned",
  ] satisfies Array<AgentRankReputationEvent["type"]>;
  const criticalEvents = criticalEventTypes.map((type) => {
    const coverageItem = coverage.eventTypes.find((item) => item.type === type);

    return {
      count: coverageItem?.count ?? 0,
      covered: coverageItem?.covered ?? false,
      layer: coverageItem?.layer ?? "network",
      type,
    };
  });
  const criticalCoveredCount = criticalEvents.filter((event) => event.covered).length;
  const criticalLabels =
    locale === "ko"
      ? {
          actionEyebrow: "다음 보강 액션",
          actionResult: "생성될 평판 기록",
          actionSubmit: "이 액션 실행",
          progress: "핵심 이벤트",
          subtitle:
            "AI 스타 발견부터 크리에이터 여정과 x402 미리보기 의도까지 Phase 1 평판 기록이 살아 있는지 먼저 확인합니다.",
          title: "FanLetter Phase 1 이벤트 체인",
        }
      : {
          actionEyebrow: "Next coverage action",
          actionResult: "Reputation event",
          actionSubmit: "Run this action",
          progress: "Core events",
          subtitle:
            "Checks whether Phase 1 reputation events are active from discovery through Creator Journey and x402 mock intent.",
          title: "FanLetter Phase 1 event chain",
        };
  const primaryCoverageAction = coverage.gaps[0]
    ? getCoverageGapAction({
        gap: coverage.gaps[0],
        locale,
        starId,
      })
    : null;

  if (starId) {
    coverageParams.set("starId", starId);
    coveragePageParams.set("starId", starId);
    coverageCsvParams.set("starId", starId);
  }

  coverageCsvParams.set("format", "csv");

  return (
    <section className="agentrank-flow-card rounded-lg border border-zinc-200 bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.07)]">
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold uppercase text-zinc-600">
              {copy.coverage.title}
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-900"
                href={`/${locale}/fanletter/agentrank/coverage?${coveragePageParams.toString()}`}
              >
                <ShieldCheck className="size-3.5" />
                {copy.coverage.auditPage}
              </a>
              <a
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 text-xs font-semibold text-zinc-900"
                href={`/api/fanletter/agentrank/coverage?${coverageParams.toString()}`}
              >
                <Database className="size-3.5" />
                {copy.coverage.api}
              </a>
              <a
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700"
                href={`/api/fanletter/agentrank/coverage?${coverageCsvParams.toString()}`}
              >
                <Download className="size-3.5" />
                {copy.coverage.csv}
              </a>
            </div>
          </div>
          <h2 className="mt-1 text-3xl font-semibold text-[#11132d]">
            {copy.coverage.phase1Quality} · {coverage.phase1QualityScore}%
          </h2>
          <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
            {copy.coverage.subtitle}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <CoverageProgress
              label={copy.coverage.eventCoverage}
              value={coverage.eventTypeCoveragePercent}
            />
            <CoverageProgress
              label={copy.coverage.interactionCoverage}
              value={coverage.interactionSourceCoveragePercent}
            />
            <CoverageProgress
              label={copy.coverage.oracleCoverage}
              value={coverage.oracleCoveragePercent}
            />
            <CoverageProgress
              label={copy.coverage.schemaCoverage}
              value={coverage.schemaCoveragePercent}
            />
            <CoverageProgress
              label={copy.coverage.contractCoverage}
              value={coverage.contractValidationPercent}
            />
            <CoverageProgress
              label={copy.coverage.backfillReadiness}
              value={backfill.readinessScore}
            />
          </div>
          <div className="mt-5 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4">
            <p className="text-sm font-semibold text-zinc-900">
              {copy.coverage.gaps}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {coverage.gaps.map((gap) => (
                <span
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 ring-1 ring-zinc-200"
                  key={gap}
                >
                  {getCoverageGapLabel(gap, locale)}
                </span>
              ))}
            </div>
            {primaryCoverageAction ? (
              <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
                  {criticalLabels.actionEyebrow}
                </p>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="break-words text-lg font-semibold leading-tight text-zinc-950 [word-break:keep-all]">
                      {primaryCoverageAction.trigger}
                    </h3>
                    <p className="mt-1 text-sm font-medium leading-5 text-zinc-600 [word-break:keep-all]">
                      {primaryCoverageAction.description}
                    </p>
                    <p className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 ring-1 ring-zinc-200">
                      <ShieldCheck className="size-3.5 shrink-0" />
                      <span className="truncate">
                        {criticalLabels.actionResult}:{" "}
                        {getEventTypeLabel(primaryCoverageAction.eventType, locale)}
                      </span>
                    </p>
                  </div>
                  <FanletterTrackedLink
                    agentRank={{
                      eventType: primaryCoverageAction.eventType,
                      intent: "agentrank_coverage_primary_action_opened",
                      source: "fanletter_agentrank",
                      starId: starId ?? null,
                    }}
                    className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-black px-4 py-2 text-center text-sm font-semibold leading-tight !text-white transition hover:bg-zinc-800"
                    eventName="content_open"
                    href={primaryCoverageAction.href}
                    metadata={{
                      coverageAction: primaryCoverageAction.coverageAction,
                      gapKey: primaryCoverageAction.key,
                      placement: "agentrank_coverage_primary_action",
                    }}
                  >
                    {criticalLabels.actionSubmit}
                    <ArrowRight className="size-4 shrink-0" />
                  </FanletterTrackedLink>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase text-zinc-600">
                  {criticalLabels.progress} · {criticalCoveredCount}/
                  {criticalEvents.length}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-zinc-950">
                  {criticalLabels.title}
                </h3>
                <p className="mt-1 text-sm font-medium leading-5 text-zinc-600 [word-break:keep-all]">
                  {criticalLabels.subtitle}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  criticalCoveredCount === criticalEvents.length
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-white text-zinc-600 ring-1 ring-zinc-200"
                }`}
              >
                {Math.round((criticalCoveredCount / criticalEvents.length) * 100)}%
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {criticalEvents.map((item) => {
                const Icon = eventIconMap[item.type];

                return (
                  <div
                    className={`min-w-0 rounded-lg border px-3 py-2 ${
                      item.covered
                        ? layerClass[item.layer]
                        : "border-slate-100 bg-white text-slate-400"
                    }`}
                    key={item.type}
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-[0_8px_18px_rgba(15,23,42,0.05)]">
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold text-zinc-950">
                          {getEventTypeLabel(item.type, locale)}
                        </span>
                        <span className="block text-[0.62rem] font-semibold text-slate-500">
                          {item.count} events
                        </span>
                      </span>
                      {item.covered ? (
                        <BadgeCheck className="ml-auto size-4 shrink-0 text-emerald-600" />
                      ) : (
                        <ShieldCheck className="ml-auto size-4 shrink-0 text-slate-300" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold uppercase text-[#6d28d9]">
                {copy.coverage.eventCoverage}
              </p>
              <p className="text-xs font-semibold text-slate-500">
                {coverage.totals.coveredEventTypes}/
                {coverage.totals.eventTypes}
              </p>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {coverage.eventTypes.map((item) => {
                const Icon = eventIconMap[item.type];

                return (
                  <div
                    className={`min-w-0 rounded-lg border p-3 ${
                      item.covered
                        ? layerClass[item.layer]
                        : "border-slate-100 bg-slate-50 text-slate-400"
                    }`}
                    key={item.type}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                          <Icon className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#11132d]">
                            {getEventTypeLabel(item.type, locale)}
                          </p>
                          <p className="text-xs font-semibold text-slate-500">
                            {item.count} events
                          </p>
                        </div>
                      </div>
                      {item.covered ? (
                        <BadgeCheck className="size-5 shrink-0 text-emerald-600" />
                      ) : (
                        <ShieldCheck className="size-5 shrink-0 text-slate-300" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold uppercase text-[#6d28d9]">
                {copy.coverage.interactionCoverage}
              </p>
              <p className="text-xs font-semibold text-slate-500">
                {coverage.totals.coveredInteractionSources}/
                {coverage.totals.interactionSources}
              </p>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {coverage.sources.map((source) => (
                <div
                  className={`rounded-lg border px-3 py-3 ${
                    source.covered
                      ? "border-emerald-100 bg-emerald-50/70"
                      : "border-slate-100 bg-slate-50"
                  }`}
                  key={source.source}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-semibold text-[#11132d]">
                      {getInteractionSourceLabel(source.source, locale)}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[0.68rem] font-semibold ${
                        source.covered
                          ? "bg-white text-emerald-700"
                          : "bg-white text-slate-400"
                      }`}
                    >
                      {source.count}
                    </span>
                  </div>
                  <p
                    className={`mt-2 text-xs font-semibold ${
                      source.covered ? "text-emerald-700" : "text-slate-400"
                    }`}
                  >
                    {source.covered
                      ? copy.coverage.covered
                      : copy.coverage.missing}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AgentRankScoreAggregatorPanel({
  copy,
  eventFeed,
  locale,
  scoreAggregate,
  starId,
}: {
  copy: AgentRankCopy;
  eventFeed: FanletterAgentRankReputationEventFeed;
  locale: Locale;
  scoreAggregate: AgentRankScoreAggregate;
  starId?: string | null;
}) {
  const scorePercent = Math.round(
    (scoreAggregate.score / scoreAggregate.maxScore) * 100,
  );
  const scoreScopeLabel = scoreAggregate.eventScope.includeMockEvents
    ? copy.scoreScopeCoverage
    : copy.scoreScopeOperational;
  const scoreCsvParams = new URLSearchParams({
    format: "csv",
    limit: "120",
  });
  const coverageScoreParams = new URLSearchParams({
    coverageProbe: "true",
    includeMock: "true",
    limit: "120",
  });
  const oraclePacketParams = new URLSearchParams({
    coverageProbe: "true",
    format: "oracle",
    includeMock: "true",
    limit: "120",
  });
  const highImpactLedgerParams = new URLSearchParams({
    limit: "40",
    readiness: "packet_ready",
    sort: "impact_desc",
  });
  const creatorSocialLedgerParams = new URLSearchParams({
    coverageAction: "creator_social_connected",
    limit: "40",
    sort: "latest",
    type: "creator_social_connected",
  });
  const oracleReadyLedgerParams = new URLSearchParams({
    limit: "40",
    readiness: "oracle_ready",
    sort: "quality_desc",
  });
  const needsOracleLedgerParams = new URLSearchParams({
    limit: "40",
    readiness: "needs_oracle",
    sort: "quality_asc",
  });
  const reviewQueueParams = new URLSearchParams({
    limit: "120",
  });
  const readinessItems = [
    {
      active: scoreAggregate.readiness.reputationLedgerReady,
      label: "Ledger",
    },
    {
      active: scoreAggregate.readiness.oracleReady,
      label: `Oracle ${scoreAggregate.readiness.oracleReadyPercent}%`,
    },
    {
      active: scoreAggregate.readiness.auditReady,
      label: `Audit ${scoreAggregate.readiness.auditReadyPercent}%`,
    },
    {
      active: scoreAggregate.readiness.eventQualityPercent >= 80,
      label: `Quality ${scoreAggregate.readiness.eventQualityPercent}%`,
    },
    {
      active: scoreAggregate.readiness.x402Ready,
      label: "x402",
    },
    {
      active: scoreAggregate.readiness.a2aReady,
      label: "A2A",
    },
  ];

  if (starId) {
    scoreCsvParams.set("starId", starId);
    coverageScoreParams.set("starId", starId);
    oraclePacketParams.set("starId", starId);
    highImpactLedgerParams.set("starId", starId);
    creatorSocialLedgerParams.set("starId", starId);
    oracleReadyLedgerParams.set("starId", starId);
    needsOracleLedgerParams.set("starId", starId);
    reviewQueueParams.set("starId", starId);
  }

  const ledgerQuickLinks = [
    {
      href: `/${locale}/fanletter/agentrank/events?${highImpactLedgerParams.toString()}`,
      Icon: Database,
      intent: "agentrank_high_impact_ledger_open",
      label: copy.ledgerHighImpact,
      tone: "bg-white/12 text-white ring-white/15",
      value: formatNumber(
        scoreAggregate.dimensions.find((dimension) => dimension.key === "economic")
          ?.score ?? scoreAggregate.score,
        locale,
      ),
    },
    {
      href: `/${locale}/fanletter/agentrank/events?${creatorSocialLedgerParams.toString()}`,
      Icon: AtSign,
      intent: "agentrank_creator_social_ledger_open",
      label: copy.ledgerCreatorSocial,
      tone: "bg-cyan-300/14 text-cyan-100 ring-cyan-200/25",
      value: formatNumber(
        eventFeed.summary.byType.creator_social_connected ?? 0,
        locale,
      ),
    },
    {
      href: `/${locale}/fanletter/agentrank/events?${oracleReadyLedgerParams.toString()}`,
      Icon: ShieldCheck,
      intent: "agentrank_oracle_ready_ledger_open",
      label: copy.ledgerOracleReady,
      tone: "bg-emerald-300/18 text-emerald-100 ring-emerald-200/25",
      value: `${scoreAggregate.readiness.oracleReadyPercent}%`,
    },
    {
      href: `/${locale}/fanletter/agentrank/events?${needsOracleLedgerParams.toString()}`,
      Icon: ShieldAlert,
      intent: "agentrank_oracle_gap_ledger_open",
      label: copy.ledgerNeedsOracle,
      tone: "bg-amber-300/14 text-amber-100 ring-amber-200/25",
      value: `${100 - scoreAggregate.readiness.oracleReadyPercent}%`,
    },
    {
      href: `/${locale}/fanletter/agentrank/review?${reviewQueueParams.toString()}`,
      Icon: Brain,
      intent: "agentrank_review_queue_open",
      label: copy.reviewQueue,
      tone: "bg-fuchsia-300/14 text-fuchsia-100 ring-fuchsia-200/25",
      value: `${scoreAggregate.readiness.eventQualityPercent}%`,
    },
  ];

  return (
    <section className="agentrank-flow-card overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-[0_18px_44px_rgba(15,23,42,0.07)]">
      <div className="grid gap-5 p-5 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="rounded-lg bg-gradient-to-br from-black via-zinc-900 to-zinc-700 p-5 text-white">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase text-white/70">
                {copy.scoreAggregator}
              </p>
              <h2 className="mt-2 text-4xl font-semibold">
                {scoreAggregate.score}
                <span className="text-lg font-semibold text-white/60">
                  / {formatNumber(scoreAggregate.maxScore, locale)}
                </span>
              </h2>
            </div>
            <div className="rounded-lg bg-white/12 px-4 py-3 text-right ring-1 ring-white/10">
              <p className="text-xs font-semibold uppercase text-white/60">
                {copy.scoreConfidence}
              </p>
              <p className="mt-1 text-2xl font-semibold">
                {scoreAggregate.confidence}%
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex h-9 items-center gap-2 rounded-full bg-emerald-300/18 px-3 text-xs font-semibold text-emerald-100 ring-1 ring-emerald-200/25">
              <ShieldCheck className="size-3.5" />
              {scoreScopeLabel}
            </span>
            {scoreAggregate.eventScope.excludedMockEvents > 0 ? (
              <span className="inline-flex h-9 items-center gap-2 rounded-full bg-amber-300/14 px-3 text-xs font-semibold text-amber-100 ring-1 ring-amber-200/25">
                <ShieldAlert className="size-3.5" />
                {copy.scoreScopeMockExcluded} ·{" "}
                {formatNumber(
                  scoreAggregate.eventScope.excludedMockEvents,
                  locale,
                )}
              </span>
            ) : null}
            <FanletterTrackedLink
              agentRank={{
                eventType: "content_engaged",
                intent: "agentrank_score_csv_export",
                source: "fanletter_agentrank",
                starId: starId ?? null,
              }}
              className="hidden h-9 items-center gap-2 rounded-full bg-white px-3 text-xs font-semibold text-zinc-900 sm:inline-flex"
              eventName="content_open"
              href={`/api/fanletter/agentrank/score?${scoreCsvParams.toString()}`}
              metadata={{ agentRankExport: "score_csv" }}
            >
              <Download className="size-3.5" />
              {copy.scoreCsv}
            </FanletterTrackedLink>
            <FanletterTrackedLink
              agentRank={{
                eventType: "content_engaged",
                intent: "agentrank_coverage_score_api_open",
                source: "fanletter_agentrank",
                starId: starId ?? null,
              }}
              className="hidden h-9 items-center gap-2 rounded-full bg-white/12 px-3 text-xs font-semibold text-white ring-1 ring-white/15 sm:inline-flex"
              eventName="content_open"
              href={`/api/fanletter/agentrank/score?${coverageScoreParams.toString()}`}
              metadata={{ agentRankExport: "coverage_score_json" }}
            >
              <Database className="size-3.5" />
              {copy.scoreScopeCoverage}
            </FanletterTrackedLink>
            <FanletterTrackedLink
              agentRank={{
                eventType: "content_engaged",
                intent: "agentrank_oracle_packet_export",
                source: "fanletter_agentrank",
                starId: starId ?? null,
              }}
              className="hidden h-9 items-center gap-2 rounded-full bg-white/12 px-3 text-xs font-semibold text-white ring-1 ring-white/15 sm:inline-flex"
              eventName="content_open"
              href={`/api/fanletter/agentrank/score?${oraclePacketParams.toString()}`}
              metadata={{ agentRankExport: "oracle_packet" }}
            >
              <ShieldCheck className="size-3.5" />
              {copy.oraclePacket}
            </FanletterTrackedLink>
          </div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/12">
            <div
              className="agentrank-score-bar h-full rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-white"
              style={{ width: `${scorePercent}%` }}
            />
          </div>
          <p className="mt-4 text-sm font-medium leading-6 text-white/74">
            {copy.scoreAggregatorBody}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {readinessItems.map((item) => (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${
                  item.active
                    ? "bg-emerald-300/18 text-emerald-100 ring-emerald-200/25"
                    : "bg-white/8 text-white/58 ring-white/10"
                }`}
                key={item.label}
              >
                {item.active ? (
                  <BadgeCheck className="size-3.5" />
                ) : (
                  <ShieldCheck className="size-3.5" />
                )}
                {item.label}
              </span>
            ))}
          </div>
          <div className="mt-5 hidden rounded-lg bg-white/10 p-3 ring-1 ring-white/10 sm:block">
            <p className="text-xs font-semibold uppercase text-white/58">
              {copy.quickLedger}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
              {ledgerQuickLinks.map(({ Icon, href, intent, label, tone, value }) => (
                <FanletterTrackedLink
                  agentRank={{
                    eventType: "content_engaged",
                    intent,
                    source: "fanletter_agentrank",
                    starId: starId ?? null,
                  }}
                  className={`flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 py-2 text-xs font-semibold ring-1 transition hover:bg-white hover:text-zinc-900 ${tone}`}
                  eventName="content_open"
                  href={href}
                  key={intent}
                  metadata={{
                    agentRankLedgerFilter: intent,
                    starId: starId ?? null,
                  }}
                >
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <Icon className="size-3.5 shrink-0" />
                    <span className="truncate">{label}</span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1">
                    {value}
                    <ArrowRight className="size-3.5" />
                  </span>
                </FanletterTrackedLink>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          {scoreAggregate.dimensions.map((dimension) => {
            const Icon = scoreDimensionIconMap[dimension.key];
            const isPenalty = dimension.key === "riskPenalty";
            const dimensionPercent = Math.round(
              (dimension.score / Math.max(1, dimension.maxScore)) * 100,
            );

            return (
              <div
                className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
                key={dimension.key}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
                        isPenalty
                          ? "bg-red-50 text-red-600"
                          : "bg-white text-zinc-900"
                      }`}
                    >
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#11132d]">
                        {getScoreDimensionLabel(dimension.key, locale)}
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-slate-500">
                        raw {formatNumber(dimension.rawValue, locale)}
                      </p>
                    </div>
                  </div>
                  <p
                    className={`shrink-0 text-xl font-semibold ${
                      isPenalty ? "text-red-600" : "text-zinc-900"
                    }`}
                  >
                    {isPenalty ? "-" : "+"}
                    {formatNumber(dimension.score, locale)}
                  </p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className={`h-full rounded-full ${
                      isPenalty
                        ? "bg-gradient-to-r from-red-500 to-orange-400"
                        : "agentrank-score-bar bg-gradient-to-r from-black via-zinc-700 to-zinc-400"
                    }`}
                    style={{ width: `${dimensionPercent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 border-t border-zinc-200 bg-zinc-50 p-5 xl:grid-cols-[1fr_0.9fr]">
        <div>
          <p className="text-sm font-semibold uppercase text-zinc-600">
            {copy.formula}
          </p>
          <p className="mt-2 text-sm font-medium leading-6 text-zinc-700">
            {scoreAggregate.formula}
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase text-zinc-600">
            {copy.topContributors}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            {scoreAggregate.topContributors.slice(0, 4).map((contributor) => (
              <div
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2"
                key={`${contributor.actorType}:${contributor.actorId}`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#11132d]">
                    {contributor.label ?? contributor.actorId}
                  </p>
                  <p className="text-xs font-semibold text-slate-500">
                    {contributor.actorType}
                    {contributor.role ? ` · ${contributor.role}` : ""} ·{" "}
                    {formatNumber(contributor.eventCount, locale)} events
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-zinc-900">
                  {formatNumber(contributor.contributionScore, locale)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function truncateMiddle(value: string, visible = 8) {
  return value.length > visible * 2
    ? `${value.slice(0, visible)}...${value.slice(-visible)}`
    : value;
}

function OracleEvidenceChainPanel({
  copy,
  events,
  locale,
  starId,
}: {
  copy: AgentRankCopy;
  events: AgentRankReputationEvent[];
  locale: Locale;
  starId?: string | null;
}) {
  const evidenceEvents = events.slice(0, 6);
  const auditReadyCount = events.filter(
    (event) => event.audit.status === "audit_ready",
  ).length;
  const oracleReadyCount = events.filter(
    (event) => event.reputationSignals.oracleReady,
  ).length;
  const latestHash = evidenceEvents[0]?.audit.evidenceHash ?? "-";
  const detailParams = new URLSearchParams();

  if (starId) {
    detailParams.set("starId", starId);
  }

  return (
    <section className="agentrank-flow-card overflow-hidden rounded-lg border border-cyan-100 bg-white shadow-[0_18px_44px_rgba(8,145,178,0.07)]">
      <div className="grid gap-5 p-5 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="rounded-lg border border-cyan-100 bg-cyan-50/70 p-5">
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-cyan-700">
            <Fingerprint className="size-4" />
            {copy.oracleEvidence}
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-[#11132d]">
            Agent Reputation Oracle
          </h2>
          <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
            {copy.oracleEvidenceBody}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <MetricTile
              label={copy.evidenceEvents}
              value={formatNumber(events.length, locale)}
            />
            <MetricTile
              label={copy.metrics.audit}
              value={`${formatNumber(auditReadyCount, locale)}/${formatNumber(
                events.length,
                locale,
              )}`}
            />
            <MetricTile
              label={copy.metrics.oracle}
              value={`${formatNumber(oracleReadyCount, locale)}/${formatNumber(
                events.length,
                locale,
              )}`}
            />
          </div>
          <div className="mt-4 rounded-lg bg-white p-3 ring-1 ring-cyan-100">
            <p className="text-xs font-semibold uppercase text-slate-400">
              {copy.evidenceHash}
            </p>
            <p className="mt-1 break-all font-mono text-xs font-semibold text-cyan-700">
              {latestHash}
            </p>
          </div>
        </div>

        <div className="min-w-0">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {evidenceEvents.map((event, index) => {
              const Icon = eventIconMap[event.type];
              const eventDetailParams = new URLSearchParams(detailParams);

              return (
                <FanletterTrackedLink
                  agentRank={{
                    eventType: "content_engaged",
                    intent: "agentrank_oracle_evidence_open",
                    source: "fanletter_agentrank",
                    starId: event.starId ?? starId ?? null,
                  }}
                  className="group relative min-w-0 rounded-lg border border-zinc-200 bg-zinc-50 p-4 transition hover:border-zinc-300 hover:bg-white"
                  eventName="content_open"
                  href={`/${locale}/fanletter/agentrank/events/${encodeURIComponent(
                    event.eventId,
                  )}${
                    eventDetailParams.size
                      ? `?${eventDetailParams.toString()}`
                      : ""
                  }`}
                  key={event.eventId}
                  metadata={{
                    agentRankEvidenceHash: event.audit.evidenceHash,
                    agentRankEventId: event.eventId,
                    agentRankEventType: event.type,
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-cyan-700 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                      <Icon className="size-5" />
                    </span>
                    <span className="rounded-full bg-white px-2 py-1 text-[0.68rem] font-semibold text-slate-500 ring-1 ring-slate-100">
                      #{index + 1}
                    </span>
                  </div>
                  <p className="mt-3 truncate font-semibold text-[#11132d]">
                    {getEventTypeLabel(event.type, locale)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">
                    {formatDateTime(event.occurredAt, locale)}
                  </p>
                  <div className="mt-3 rounded-lg bg-white px-3 py-2 ring-1 ring-slate-100">
                    <p className="text-[0.65rem] font-semibold uppercase text-slate-400">
                      {copy.evidenceHash}
                    </p>
                    <p className="mt-1 font-mono text-xs font-semibold text-cyan-700">
                      {truncateMiddle(event.audit.evidenceHash, 9)}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-2 py-1 text-[0.68rem] font-semibold ${
                        event.audit.status === "audit_ready"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {event.audit.status}
                    </span>
                    <span
                      className={`rounded-full px-2 py-1 text-[0.68rem] font-semibold ${
                        event.reputationSignals.oracleReady
                          ? "bg-cyan-50 text-cyan-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      Oracle
                    </span>
                    <span className="rounded-full bg-white px-2 py-1 text-[0.68rem] font-semibold text-slate-500 ring-1 ring-slate-100">
                      Q{event.audit.qualityScore}
                    </span>
                  </div>
                </FanletterTrackedLink>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustProblemPanel({ copy }: { copy: AgentRankCopy }) {
  return (
    <section className="grid gap-4 xl:grid-cols-[1fr_auto_1fr]">
      <div className="agentrank-flow-card rounded-lg border border-blue-100 bg-white p-5 shadow-[0_18px_44px_rgba(37,99,235,0.07)]">
        <div className="inline-flex rounded-full bg-blue-700 px-3 py-1 text-xs font-semibold text-white">
          1998 · GOOGLE SOLVED THE WEB TRUST PROBLEM
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-[0.78fr_1fr_0.78fr] md:items-center">
          <div>
            <p className="text-3xl font-semibold text-blue-700">Google</p>
            <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
              {copy.googleProblem}
            </p>
          </div>
          <MiniConnectionGraph variant="web" />
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-center">
            <div className="agentrank-soft-float mx-auto flex size-12 items-center justify-center rounded-lg bg-white text-blue-700 shadow-[0_12px_26px_rgba(37,99,235,0.12)]">
              <Sparkles className="size-6" />
            </div>
            <p className="mt-3 text-xl font-semibold text-blue-800">
              {copy.pageRank}
            </p>
            <p className="mt-1 text-sm font-medium text-blue-700">
              Ranks web pages by link authority
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-lg bg-blue-50 px-4 py-3 text-center text-sm font-semibold text-blue-700">
          {copy.googleTrustLine}
        </div>
      </div>

      <div className="flex items-center justify-center">
        <span className="agentrank-soft-float flex size-16 items-center justify-center rounded-full bg-[#151735] text-xl font-semibold text-white shadow-[0_18px_44px_rgba(15,23,42,0.18)]">
          VS
        </span>
      </div>

      <div className="agentrank-flow-card rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.08)]">
        <div className="inline-flex rounded-full bg-[#6d28d9] px-3 py-1 text-xs font-semibold text-white">
          2026+ · AI AGENTS FACE THE SAME TRUST PROBLEM
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div>
            <h2 className="text-2xl font-semibold text-[#11132d]">
              {copy.agentRank}
            </h2>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
              {copy.trustLayerMissing}
            </p>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {["LLM", "MCP", "A2A", "x402"].map((layer) => (
                <div
                  className="rounded-lg border border-violet-100 bg-violet-50/70 px-2 py-3 text-center text-xs font-semibold text-[#4338ca]"
                  key={layer}
                >
                  {layer}
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-lg border border-dashed border-violet-300 bg-white p-3 text-center text-sm font-semibold text-[#6d28d9]">
              ??? · Trust Layer is Missing
            </div>
          </div>
          <MiniConnectionGraph variant="agent" />
        </div>
        <div className="mt-4 rounded-lg bg-violet-50 px-4 py-3 text-center text-sm font-semibold text-[#6d28d9]">
          {copy.agentRankTrustLine}
        </div>
      </div>
    </section>
  );
}

function ProductPathPanel({
  copy,
  ers,
}: {
  copy: AgentRankCopy;
  ers: AgentRankEconomicReputationScore;
}) {
  const fanletterEvents = [
    { icon: <Eye className="size-5" />, label: "Watch Vlog" },
    { icon: <Heart className="size-5" />, label: "Like / Comment" },
    { icon: <Users className="size-5" />, label: "Join Universe" },
    { icon: <Network className="size-5" />, label: "Invite Founder" },
    { icon: <Rocket className="size-5" />, label: "Create AI Star" },
    { icon: <WalletCards className="size-5" />, label: "x402 Payment" },
    { icon: <Bot className="size-5" />, label: "A2A Call" },
    { icon: <Orbit className="size-5" />, label: "Repeat Usage" },
    { icon: <Sparkles className="size-5" />, label: "More Events" },
  ];
  const miziInfra = [
    { icon: <ShieldCheck className="size-5" />, label: "Identity" },
    { icon: <Database className="size-5" />, label: "Skills & Profile" },
    { icon: <Network className="size-5" />, label: "MCP" },
    { icon: <Bot className="size-5" />, label: "A2A" },
    { icon: <WalletCards className="size-5" />, label: "x402" },
    { icon: <BadgeCheck className="size-5" />, label: "Oracle" },
  ];
  const agentRankSignals = [
    { icon: <Coins className="size-5" />, label: "Revenue" },
    { icon: <Users className="size-5" />, label: "Customers" },
    { icon: <Orbit className="size-5" />, label: "Retention" },
    { icon: <Bot className="size-5" />, label: "A2A Usage" },
    { icon: <GitBranch className="size-5" />, label: "Lineage" },
    { icon: <ShieldAlert className="size-5" />, label: "Risk" },
  ];

  return (
    <section className="rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.07)]">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase text-[#6d28d9]">
          OUR VISION: THE AI AGENT TRUST STACK
        </p>
        <h2 className="mt-1 text-3xl font-semibold text-[#11132d]">
          {copy.productPath}
        </h2>
      </div>
      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <div
          className="agentrank-flow-card agentrank-stage-card relative min-w-0 overflow-visible rounded-lg border border-pink-100 bg-pink-50/35 p-5"
          style={{ animationDelay: "80ms" }}
        >
          <ArrowRight className="absolute -right-4 top-1/2 hidden size-8 -translate-y-1/2 text-pink-400 xl:block" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase text-pink-600">
                1. {copy.fanletter}
              </p>
              <h3 className="mt-1 text-2xl font-semibold text-[#11132d]">
                {copy.eventFactory}
              </h3>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                {copy.fanletterBody}
              </p>
            </div>
            <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-white text-pink-600 shadow-[0_12px_28px_rgba(219,39,119,0.1)]">
              <Heart className="size-7" />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {fanletterEvents.map((event) => (
              <IconMiniTile
                icon={event.icon}
                key={event.label}
                label={event.label}
                tone="pink"
              />
            ))}
          </div>
          <div className="mt-5 rounded-lg bg-gradient-to-r from-pink-500 to-fuchsia-500 px-4 py-3 text-center text-sm font-semibold text-white">
            Raw data of value, behavior, and interactions
          </div>
        </div>

        <div
          className="agentrank-flow-card agentrank-stage-card relative min-w-0 overflow-visible rounded-lg border border-blue-100 bg-blue-50/35 p-5"
          style={{ animationDelay: "160ms" }}
        >
          <ArrowRight className="absolute -right-4 top-1/2 hidden size-8 -translate-y-1/2 text-blue-400 xl:block" />
          <div className="text-center">
            <p className="text-sm font-semibold uppercase text-blue-700">
              2. {copy.miziEquals}
            </p>
            <h3 className="mt-1 text-2xl font-semibold text-[#11132d]">
              People Search Engine
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-slate-600">
              {copy.miziPeople}
            </p>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <div className="rounded-lg border border-blue-100 bg-white p-3 text-center text-xs font-semibold text-blue-700">
              Who is the best person for this job?
            </div>
            <div className="agentrank-soft-float mx-auto flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-[0_18px_44px_rgba(37,99,235,0.22)]">
              <Bot className="size-11" />
            </div>
            <div className="rounded-lg border border-blue-100 bg-white p-3 text-center text-xs font-semibold text-blue-700">
              Which AI Agent is the most trusted?
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-blue-100 bg-white p-3 text-center text-xs font-semibold text-blue-700">
            Who has the right skills and proven track record?
          </div>
          <p className="mt-5 text-sm font-semibold uppercase text-blue-700">
            {copy.reputationInfrastructure}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {miziInfra.map((item) => (
              <IconMiniTile
                icon={item.icon}
                key={item.label}
                label={item.label}
                tone="blue"
              />
            ))}
          </div>
          <div className="mt-5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 text-center text-sm font-semibold text-white">
            {copy.collectVerify}
          </div>
        </div>

        <div
          className="agentrank-flow-card agentrank-stage-card relative min-w-0 overflow-visible rounded-lg border border-violet-100 bg-violet-50/40 p-5"
          style={{ animationDelay: "240ms" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase text-[#6d28d9]">
                3. {copy.agentRank}
              </p>
              <h3 className="mt-1 text-2xl font-semibold text-[#11132d]">
                Economic Reputation Engine
              </h3>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                {copy.agentRankBody}
              </p>
            </div>
            <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-white text-[#6d28d9] shadow-[0_12px_28px_rgba(88,28,135,0.1)]">
              <Brain className="size-7" />
            </div>
          </div>
          <div className="mt-5 rounded-lg border border-violet-100 bg-white p-4">
            <p className="text-center text-sm font-semibold uppercase text-[#6d28d9]">
              {copy.agentTransactionGraph}
            </p>
            <div className="mt-3">
              <MiniConnectionGraph variant="agent" />
            </div>
            <div className="agentrank-soft-float mx-auto -mt-8 flex w-fit min-w-24 justify-center rounded-lg bg-gradient-to-br from-[#6d28d9] to-[#4338ca] px-5 py-3 text-3xl font-semibold text-white shadow-[0_16px_34px_rgba(88,28,135,0.22)]">
              {ers.score}
            </div>
          </div>
          <p className="mt-5 text-sm font-semibold uppercase text-[#6d28d9]">
            {copy.ers}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {agentRankSignals.map((signal) => (
              <IconMiniTile
                icon={signal.icon}
                key={signal.label}
                label={signal.label}
              />
            ))}
          </div>
          <div className="mt-5 rounded-lg bg-gradient-to-r from-[#6d28d9] to-[#4338ca] px-4 py-3 text-center text-sm font-semibold text-white">
            {copy.agentRankCta}
          </div>
        </div>
      </div>
    </section>
  );
}

function ErsScorePanel({
  copy,
  ers,
  locale,
}: {
  copy: AgentRankCopy;
  ers: AgentRankEconomicReputationScore;
  locale: Locale;
}) {
  const scorePercent = Math.round((ers.score / ers.maxScore) * 100);

  return (
    <section className="agentrank-flow-card rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.07)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase text-[#6d28d9]">
            {copy.ers}
          </p>
          <h2 className="mt-1 text-3xl font-semibold text-[#11132d]">
            {copy.score}
          </h2>
        </div>
        <div className="agentrank-soft-float rounded-lg bg-gradient-to-br from-[#6d28d9] to-[#2563eb] px-5 py-4 text-right text-white shadow-[0_18px_44px_rgba(88,28,135,0.25)]">
          <p className="text-sm font-semibold text-white/76">ERS</p>
          <p className="text-5xl font-semibold">{ers.score}</p>
          <p className="text-sm font-semibold text-white/76">
            / {formatNumber(ers.maxScore, locale)}
          </p>
        </div>
      </div>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-violet-100">
        <div
          className="agentrank-score-bar h-full rounded-full bg-gradient-to-r from-[#6d28d9] via-[#2563eb] to-[#16a34a]"
          style={{ width: `${scorePercent}%` }}
        />
      </div>
      <p className="mt-4 rounded-lg border border-violet-100 bg-violet-50 px-4 py-3 text-sm font-semibold text-[#4c1d95]">
        {ers.formula}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ers.components.map((component) => {
          const Icon = componentIconMap[component.key];
          const isPenalty = component.key === "riskPenalty";

          return (
            <div
              className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
              key={component.key}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
                      isPenalty
                        ? "bg-red-50 text-red-600"
                        : "bg-white text-[#6d28d9]"
                    }`}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#11132d]">
                      {component.label}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-slate-500">
                      {formatNumber(component.rawValue, locale)}
                    </p>
                  </div>
                </div>
                <p
                  className={`text-xl font-semibold ${
                    isPenalty ? "text-red-600" : "text-[#4338ca]"
                  }`}
                >
                  {isPenalty ? "-" : "+"}
                  {formatNumber(component.score, locale)}
                </p>
              </div>
              <p className="mt-3 text-xs font-medium leading-5 text-slate-500">
                {component.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function EconomicActivityPanel({
  copy,
}: {
  copy: AgentRankCopy;
}) {
  const formulaItems = [
    { icon: <Coins className="size-5" />, label: "Revenue", sign: "+" },
    { icon: <Users className="size-5" />, label: "Unique Customers", sign: "+" },
    { icon: <Orbit className="size-5" />, label: "Retention", sign: "+" },
    { icon: <Bot className="size-5" />, label: "A2A Usage", sign: "+" },
    { icon: <GitBranch className="size-5" />, label: "Lineage Trust", sign: "-" },
    { icon: <ShieldAlert className="size-5" />, label: "Risk Penalty", sign: "=" },
  ];
  const activityItems = [
    { icon: <WalletCards className="size-5" />, label: "Payment (x402)" },
    { icon: <Bot className="size-5" />, label: "Agent Call (A2A)" },
    { icon: <Orbit className="size-5" />, label: "Repeat Usage" },
    { icon: <Rocket className="size-5" />, label: "Creator Spawn" },
    { icon: <Users className="size-5" />, label: "Founder Contribution" },
    { icon: <Network className="size-5" />, label: "Value Flow" },
  ];
  const useCases = [
    "Agent Hiring",
    "Collaboration Matching",
    "Task Delegation",
    "Investment Decision",
    "Risk Assessment",
    "Ecosystem Growth",
  ];
  const futureItems = [
    "AI Agents",
    "Builders",
    "Users",
    "Enterprises",
    "Investors",
    "Oracles",
  ];

  return (
    <section className="grid gap-5 xl:grid-cols-[1.12fr_0.88fr]">
      <div className="agentrank-flow-card rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.07)]">
        <p className="text-sm font-semibold uppercase text-[#6d28d9]">
          {copy.formula}
        </p>
        <h2 className="mt-1 text-3xl font-semibold text-[#11132d]">
          {copy.ers} Formula
        </h2>
        <div className="mt-5 grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {formulaItems.map((item) => (
            <div className="min-w-0" key={item.label}>
              <IconMiniTile icon={item.icon} label={item.label} />
              <p
                className={`mt-2 text-center text-lg font-semibold ${
                  item.sign === "-" ? "text-red-500" : "text-[#6d28d9]"
                }`}
              >
                {item.sign}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-lg bg-gradient-to-r from-[#6d28d9] to-[#4338ca] px-5 py-4 text-center text-2xl font-semibold text-white">
          ERS · AgentRank Score
        </div>
      </div>

      <div
        className="agentrank-flow-card rounded-lg border border-emerald-100 bg-white p-5 shadow-[0_18px_44px_rgba(16,185,129,0.08)]"
        style={{ animationDelay: "100ms" }}
      >
        <p className="text-sm font-semibold uppercase text-emerald-700">
          {copy.economicActivity}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {activityItems.map((item) => (
            <IconMiniTile
              icon={item.icon}
              key={item.label}
              label={item.label}
              tone="emerald"
            />
          ))}
        </div>
      </div>

      <div
        className="agentrank-flow-card rounded-lg border border-blue-100 bg-white p-5 shadow-[0_18px_44px_rgba(37,99,235,0.07)]"
        style={{ animationDelay: "180ms" }}
      >
        <p className="text-sm font-semibold uppercase text-blue-700">
          {copy.miziEquals}
        </p>
        <h2 className="mt-1 text-3xl font-semibold text-[#11132d]">
          PeopleGPT
        </h2>
        <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
          {copy.miziPeople}
        </p>
        <div className="mt-4 flex min-w-0 items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/60 p-2">
          <div className="min-w-0 flex-1 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-500">
            Find the most trusted AI Agent for...
          </div>
          <div
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white"
          >
            <ArrowRight className="size-5" />
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div
          className="agentrank-flow-card rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.07)]"
          style={{ animationDelay: "260ms" }}
        >
          <p className="text-sm font-semibold uppercase text-[#6d28d9]">
            {copy.useCases}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {useCases.map((item) => (
              <div
                className="rounded-lg border border-violet-100 bg-violet-50/60 px-3 py-3 text-sm font-semibold text-[#11132d]"
                key={item}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
        <div
          className="agentrank-flow-card rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.07)]"
          style={{ animationDelay: "340ms" }}
        >
          <p className="text-sm font-semibold uppercase text-[#6d28d9]">
            {copy.futureBuild}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {futureItems.map((item) => (
              <div
                className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm font-semibold text-[#11132d]"
                key={item}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function EventFactoryPanel({
  copy,
  coverage,
  events,
  locale,
}: {
  copy: AgentRankCopy;
  coverage: AgentRankCoverageSnapshot;
  events: AgentRankReputationEvent[];
  locale: Locale;
}) {
  const manifest = coverage.factoryManifest;
  const factoryCompatibleLabel =
    locale === "ko" ? "AgentRank 호환" : "AgentRank Compatible";
  const factoryNeedsDataLabel =
    locale === "ko" ? "추가 데이터 필요" : "Needs More Data";
  const factoryItems = [
    {
      icon: <Eye className="size-5" />,
      label: "Watch Vlog",
    },
    {
      icon: <Users className="size-5" />,
      label: "Join Universe",
    },
    {
      icon: <Network className="size-5" />,
      label: "Invite Founder",
    },
    {
      icon: <Rocket className="size-5" />,
      label: "Create AI Star",
    },
    {
      icon: <WalletCards className="size-5" />,
      label: "x402 Payment",
    },
    {
      icon: <Bot className="size-5" />,
      label: "A2A Usage",
    },
  ];

  return (
    <section className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
      <div className="agentrank-flow-card min-w-0 rounded-lg border border-pink-100 bg-white p-5 shadow-[0_18px_44px_rgba(219,39,119,0.07)]">
        <p className="text-sm font-semibold uppercase text-pink-600">
          {copy.eventFactory}
        </p>
        <h2 className="mt-1 text-3xl font-semibold text-[#11132d]">
          FanLetter
        </h2>
        <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
          {copy.eventFactoryBody}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {factoryItems.map((item) => (
            <div
              className="rounded-lg border border-pink-100 bg-pink-50/60 p-3 text-center"
              key={item.label}
            >
              <div className="mx-auto flex size-10 items-center justify-center rounded-lg bg-white text-pink-600">
                {item.icon}
              </div>
              <p className="mt-2 text-xs font-semibold text-[#11132d]">
                {item.label}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-lg bg-gradient-to-r from-pink-500 to-fuchsia-500 px-4 py-3 text-center text-sm font-semibold text-white">
          {copy.cleanEvents}
        </div>
        <div className="mt-4 rounded-lg border border-violet-100 bg-violet-50/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold ${
                manifest.agentRankCompatible
                  ? "border-emerald-100 bg-white text-emerald-700"
                  : "border-amber-100 bg-white text-amber-700"
              }`}
            >
              {manifest.agentRankCompatible ? (
                <BadgeCheck className="size-3.5" />
              ) : (
                <ShieldAlert className="size-3.5" />
              )}
              {manifest.agentRankCompatible
                ? factoryCompatibleLabel
                : factoryNeedsDataLabel}
            </span>
            <span className="max-w-full break-all rounded-full bg-white px-3 py-1.5 text-[0.68rem] font-semibold text-[#6d28d9] ring-1 ring-violet-100">
              {manifest.recordType}
            </span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {manifest.layers.map((layer) => (
              <div className="rounded-lg bg-white p-3" key={layer.layer}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-[#11132d]">
                    {getFactoryLayerLabel(layer.layer, locale)}
                  </p>
                  <p className="text-xs font-semibold text-[#6d28d9]">
                    {layer.coveragePercent}%
                  </p>
                </div>
                <p className="mt-1 text-[0.68rem] font-semibold text-slate-400">
                  {formatNumber(layer.totalEvents, locale)}{" "}
                  {copy.metrics.events} · {formatNumber(layer.oracleReadyEvents, locale)}{" "}
                  {copy.metrics.oracle}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="agentrank-flow-card min-w-0 rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.07)]"
        style={{ animationDelay: "120ms" }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase text-[#6d28d9]">
              AgentRank Ledger
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-[#11132d]">
              {copy.eventTimeline}
            </h2>
          </div>
          <Database className="size-8 text-[#6d28d9]" />
        </div>
        <div className="mt-4 grid gap-3">
          {events.slice(0, 8).map((event) => {
            const Icon = eventIconMap[event.type];
            const intent =
              typeof event.context.intent === "string"
                ? event.context.intent
                : null;

            return (
              <div
                className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                key={event.eventId}
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-[#6d28d9]">
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                    <p className="font-semibold text-[#11132d]">
                      {getEventTypeLabel(event.type, locale)}
                    </p>
                    <p className="text-xs font-semibold text-slate-400 sm:shrink-0">
                      {formatDateTime(event.occurredAt, locale)}
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full bg-violet-50 px-2 py-1 text-[0.68rem] font-semibold text-[#6d28d9]">
                      {getEventSourceLabel(event.source, locale)}
                    </span>
                    {intent ? (
                      <span className="max-w-full break-all rounded-full bg-white px-2 py-1 text-[0.68rem] font-semibold text-slate-500">
                        {intent}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 break-all font-mono text-xs font-semibold text-[#6d28d9]">
                    {event.sourceId}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="max-w-full break-all rounded-full bg-white px-2 py-1 text-[0.68rem] font-semibold text-slate-600">
                      {event.actor.type}: {event.actor.id}
                    </span>
                    {event.economicLayer.cpDelta ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-[0.68rem] font-semibold text-emerald-700">
                        CP +{formatNumber(event.economicLayer.cpDelta, locale)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ReadinessPill({
  active,
  label,
}: {
  active: boolean;
  label: string;
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
        active
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
          : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
      }`}
    >
      {active ? <BadgeCheck className="size-4" /> : <ShieldCheck className="size-4" />}
      {label}
    </div>
  );
}

function AgentRankMobileStatusCard({
  copy,
  locale,
  scoreAggregate,
}: {
  copy: AgentRankCopy;
  locale: Locale;
  scoreAggregate: AgentRankScoreAggregate;
}) {
  const isKo = locale === "ko";
  const scorePercent = Math.round(
    (scoreAggregate.score / Math.max(1, scoreAggregate.maxScore)) * 100,
  );
  const nextSignal = !scoreAggregate.readiness.oracleReady
    ? isKo
      ? "오라클 증거 보강"
      : "Strengthen oracle evidence"
    : !scoreAggregate.readiness.auditReady
      ? isKo
        ? "감사 준비도 보강"
        : "Improve audit readiness"
      : scoreAggregate.readiness.eventQualityPercent < 80
        ? isKo
          ? "이벤트 품질 보강"
          : "Improve event quality"
        : !scoreAggregate.readiness.x402Ready
          ? isKo
            ? "x402 미리보기 이벤트 연결"
            : "Connect x402 mock events"
          : !scoreAggregate.readiness.a2aReady
            ? isKo
              ? "A2A 사용 이벤트 연결"
              : "Connect A2A usage events"
            : isKo
              ? "AgentRank 패킷 준비됨"
              : "AgentRank packet ready";

  return (
    <section className="mt-5 rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)] sm:hidden">
      <p className="inline-flex max-w-full items-center gap-2 rounded-full bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-700 ring-1 ring-zinc-200">
        <Brain className="size-3.5 shrink-0" />
        <span className="truncate">
          {isKo ? "현재 위치: AgentRank 점수" : "Now: AgentRank score"}
        </span>
      </p>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">{copy.score}</p>
          <p className="mt-1 text-4xl font-semibold leading-none text-[#11132d]">
            {formatNumber(scoreAggregate.score, locale)}
          </p>
        </div>
        <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
          {copy.scoreConfidence} {scoreAggregate.confidence}%
        </span>
      </div>
      <div className="mt-4 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-black via-zinc-700 to-zinc-400"
          style={{ width: `${Math.min(100, Math.max(0, scorePercent))}%` }}
        />
      </div>
      <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-zinc-500">
          {isKo ? "다음 보강 신호" : "Next signal"}
        </p>
        <p className="mt-1 text-sm font-semibold leading-tight text-zinc-950 [word-break:keep-all]">
          {nextSignal}
        </p>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-zinc-50 px-3 py-2">
          <p className="truncate text-[0.62rem] font-semibold uppercase text-zinc-500">
            {copy.metrics.events}
          </p>
          <p className="mt-1 truncate text-lg font-semibold text-zinc-950">
            {formatNumber(scoreAggregate.summary.eventCount, locale)}
          </p>
        </div>
        <div className="rounded-lg bg-emerald-50 px-3 py-2">
          <p className="truncate text-[0.62rem] font-semibold uppercase text-emerald-700/70">
            {copy.metrics.oracle}
          </p>
          <p className="mt-1 truncate text-lg font-semibold text-emerald-800">
            {scoreAggregate.readiness.oracleReadyPercent}%
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="truncate text-[0.62rem] font-semibold uppercase text-slate-400">
            {copy.metrics.quality}
          </p>
          <p className="mt-1 truncate text-lg font-semibold text-[#11132d]">
            {scoreAggregate.readiness.eventQualityPercent}%
          </p>
        </div>
      </div>
    </section>
  );
}

function AgentRankAudienceSplit({
  auditReadyCount,
  eventCount,
  locale,
}: {
  auditReadyCount: number;
  eventCount: number;
  locale: Locale;
}) {
  const isKo = locale === "ko";
  const cards = [
    {
      Icon: Users,
      badge: isKo ? "사용자 화면" : "User view",
      body: isKo
        ? "AI 스타 발견, 파운더 참여, 추천 공유가 평판 기록을 만듭니다."
        : "Discovery, founder joins, and referral shares create reputation events.",
      metric: formatNumber(eventCount, locale),
      metricLabel: isKo ? "수집 이벤트" : "events collected",
      title: isKo ? "행동을 만든다" : "Creates actions",
    },
    {
      Icon: Database,
      badge: isKo ? "투자자 화면" : "Investor view",
      body: isKo
        ? "이벤트 장부, 증거 패킷, 점수 집계로 네트워크 신뢰를 검증합니다."
        : "The ledger, evidence packets, and scores verify network trust.",
      metric: formatNumber(auditReadyCount, locale),
      metricLabel: isKo ? "검증 가능 이벤트" : "audit-ready events",
      title: isKo ? "신뢰를 검증한다" : "Verifies trust",
    },
  ];

  return (
    <section className="mt-4 hidden gap-2 sm:grid sm:grid-cols-2 sm:gap-3">
      {cards.map(({ Icon, badge, body, metric, metricLabel, title }) => (
        <div
          className="min-w-0 rounded-[1.15rem] border border-zinc-200 bg-white p-3 shadow-[0_14px_34px_rgba(15,23,42,0.05)] sm:p-4"
          key={badge}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[0.68rem] font-semibold text-zinc-700">
                {badge}
              </span>
              <h2 className="mt-2 text-lg font-semibold leading-tight text-zinc-950">
                {title}
              </h2>
            </div>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-white">
              <Icon className="size-4" />
            </span>
          </div>
          <p className="mt-2 hidden text-sm font-medium leading-5 text-zinc-600 [word-break:keep-all] sm:block">
            {body}
          </p>
          <div className="mt-4 flex items-end justify-between gap-3 border-t border-zinc-100 pt-3">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
              {metricLabel}
            </span>
            <span className="text-2xl font-semibold leading-none text-zinc-950">
              {metric}
            </span>
          </div>
        </div>
      ))}
    </section>
  );
}

function AgentRankUserPathPanel({
  eventCount,
  founderNetworkHref,
  ledgerHref,
  locale,
  score,
  starId,
}: {
  eventCount: number;
  founderNetworkHref: string;
  ledgerHref: string;
  locale: Locale;
  score: number;
  starId?: string | null;
}) {
  const isKo = locale === "ko";
  const steps = [
    {
      Icon: Eye,
      label: isKo ? "AI 스타 발견" : "Discover AI Stars",
      value: isKo ? "행동 시작" : "Start action",
    },
    {
      Icon: Users,
      label: isKo ? "파운더 네트워크" : "Founder Network",
      value: isKo ? "참여/추천" : "Join / refer",
    },
    {
      Icon: ShieldCheck,
      label: isKo ? "평판 기록" : "Reputation records",
      value: formatNumber(eventCount, locale),
    },
    {
      Icon: Brain,
      label: "AgentRank",
      value: formatNumber(score, locale),
    },
  ];

  return (
    <section className="mt-4 overflow-hidden rounded-[1.15rem] border border-zinc-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
      <div className="p-3.5 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-zinc-500">
              {isKo ? "사용자 흐름" : "User flow"}
            </p>
            <h2 className="mt-1 text-xl font-semibold leading-tight text-zinc-950 [word-break:keep-all]">
              {isKo
                ? "내 행동이 평판 기록으로 쌓입니다"
                : "Your actions become reputation records"}
            </h2>
          </div>
          <FanletterTrackedLink
            agentRank={{
              eventType: "content_engaged",
              intent: "agentrank_user_path_ledger_open",
              source: "fanletter_agentrank",
              starId: starId ?? null,
            }}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-black px-4 py-2.5 text-center text-sm font-semibold leading-tight !text-white shadow-[0_14px_28px_rgba(15,23,42,0.16)] transition hover:bg-zinc-800 sm:w-auto"
            eventName="content_open"
            href={ledgerHref}
            metadata={{
              placement: "agentrank_user_path_primary",
            }}
          >
            {isKo ? "평판 기록 보기" : "View records"}
            <ArrowRight className="size-4 shrink-0" />
          </FanletterTrackedLink>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {steps.map(({ Icon, label, value }, index) => (
            <div
              className="min-w-0 rounded-lg border border-zinc-200 bg-zinc-50 p-3"
              key={label}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-zinc-950 shadow-[0_8px_18px_rgba(15,23,42,0.05)]">
                  <Icon className="size-4" />
                </span>
                <span className="text-xs font-semibold text-zinc-400">
                  {index + 1}
                </span>
              </div>
              <p className="mt-3 break-words text-sm font-semibold leading-tight text-zinc-950 [word-break:keep-all]">
                {label}
              </p>
              <p className="mt-1 break-words text-xs font-semibold leading-tight text-zinc-500 [word-break:keep-all]">
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-zinc-200 bg-zinc-50 px-3.5 py-3 sm:px-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold leading-5 text-zinc-700 [word-break:keep-all]">
            {isKo
              ? "파운더 네트워크에서 참여와 추천이 발생하면 AgentRank 신호가 채워집니다."
              : "Founder Network joins and referrals fill AgentRank signals."}
          </p>
          <FanletterTrackedLink
            agentRank={{
              eventType: "universe_growth",
              intent: "agentrank_user_path_founder_network_open",
              source: "fanletter_agentrank",
              starId: starId ?? null,
            }}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-center text-xs font-semibold leading-tight text-zinc-900 transition hover:border-zinc-400 hover:bg-zinc-50 [word-break:keep-all]"
            eventName="content_open"
            href={founderNetworkHref}
            metadata={{
              placement: "agentrank_user_path_founder_network",
            }}
          >
            {isKo ? "파운더 네트워크" : "Founder Network"}
            <ArrowRight className="size-3.5 shrink-0" />
          </FanletterTrackedLink>
        </div>
      </div>
    </section>
  );
}

function AgentRankInvestorSectionIntro({
  copy,
  coverageHref,
  coverageQuality,
  eventCount,
  locale,
  score,
  starId,
}: {
  copy: AgentRankCopy;
  coverageHref: string;
  coverageQuality: number;
  eventCount: number;
  locale: Locale;
  score: number;
  starId?: string | null;
}) {
  const isKo = locale === "ko";

  return (
    <div className="rounded-[1.15rem] border border-zinc-200 bg-zinc-950 p-4 text-white shadow-[0_18px_46px_rgba(15,23,42,0.18)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p
            className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-white/55"
            id="agentrank-investor-section-title"
          >
            {isKo ? "투자자 / 운영자 검증 영역" : "Investor / operator verification"}
          </p>
          <h2 className="mt-1 text-2xl font-semibold leading-tight [word-break:keep-all]">
            {isKo
              ? "여기부터는 이벤트 품질과 검증 가능성을 봅니다"
              : "From here, inspect event quality and verifiability"}
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-2 lg:min-w-[22rem]">
          {[
            { label: copy.metrics.events, value: formatNumber(eventCount, locale) },
            { label: copy.score, value: formatNumber(score, locale) },
            { label: copy.metrics.quality, value: `${coverageQuality}%` },
          ].map((metric) => (
            <div
              className="min-w-0 rounded-lg bg-white/8 px-3 py-2 ring-1 ring-white/10"
              key={metric.label}
            >
              <p className="truncate text-[0.62rem] font-semibold text-white/50">
                {metric.label}
              </p>
              <p className="mt-1 truncate text-sm font-semibold">{metric.value}</p>
            </div>
          ))}
        </div>
        <FanletterTrackedLink
          agentRank={{
            eventType: "creator_unlock_evaluated",
            intent: "agentrank_investor_coverage_open",
            source: "fanletter_agentrank",
            starId: starId ?? null,
          }}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-center text-sm font-semibold leading-tight text-zinc-950 transition hover:bg-zinc-100 [word-break:keep-all]"
          eventName="content_open"
          href={coverageHref}
          metadata={{
            placement: "agentrank_investor_section_coverage",
          }}
        >
          {isKo ? "커버리지 점검" : "Check coverage"}
          <ArrowRight className="size-4 shrink-0" />
        </FanletterTrackedLink>
      </div>
    </div>
  );
}

export function FanletterAgentRankPage({
  backfill,
  coverage,
  locale,
  snapshot,
  starId,
}: {
  backfill: AgentRankBackfillReadinessSnapshot;
  coverage: AgentRankCoverageSnapshot;
  locale: Locale;
  snapshot: FanletterAgentRankInvestorSnapshot;
  starId?: string | null;
}) {
  const copy = getAgentRankCopy(locale);
  const { ers, eventFeed, scoreAggregate } = snapshot;
  const ledgerHref = `/${locale}/fanletter/agentrank/events${
    starId ? `?starId=${encodeURIComponent(starId)}&limit=40` : "?limit=40"
  }`;
  const coverageHref = `/${locale}/fanletter/agentrank/coverage${
    starId ? `?starId=${encodeURIComponent(starId)}&limit=120` : "?limit=120"
  }`;
  const founderNetworkHref = starId
    ? `/${locale}/fanletter/${encodeURIComponent(starId)}/universe`
    : `/${locale}/fanletter/founder-club`;
  const metrics = [
    {
      label: copy.metrics.events,
      value: formatNumber(ers.summary.eventCount, locale),
    },
    {
      label: copy.metrics.cp,
      value: formatNumber(ers.summary.cpTotal, locale),
    },
    {
      label: copy.metrics.cpPool,
      value: formatNumber(ers.summary.cpPoolGeneratedTotal, locale),
    },
    {
      label: copy.metrics.members,
      value: formatNumber(ers.summary.uniqueMembers, locale),
    },
    {
      label: copy.metrics.stars,
      value: formatNumber(ers.summary.uniqueStars, locale),
    },
    {
      label: copy.metrics.network,
      value: formatNumber(ers.summary.networkEdges, locale),
    },
    {
      label: copy.metrics.oracle,
      value: `${formatNumber(ers.summary.oracleReadyEvents, locale)}/${formatNumber(
        ers.summary.eventCount,
        locale,
      )}`,
    },
    {
      label: copy.metrics.audit,
      value: `${formatNumber(scoreAggregate.summary.auditReadyEvents, locale)}/${formatNumber(
        scoreAggregate.summary.eventCount,
        locale,
      )}`,
    },
    {
      label: copy.metrics.quality,
      value: `${formatNumber(scoreAggregate.summary.averageQualityScore, locale)}%`,
    },
  ];

  return (
    <main className="fanletter-v2-surface fanletter-agentrank-page min-h-screen overflow-x-hidden bg-white px-5 py-5 text-[#11132d]">
      <FanletterAgentRankTracker starId={starId} />
      <div className="mx-auto max-w-[1500px]">
        <FanletterActionGuide
          currentLabel={
            locale === "ko"
              ? "투자자 대시보드 · AgentRank"
              : "Investor dashboard · AgentRank"
          }
          metrics={[
            {
              label: copy.metrics.events,
              value: formatNumber(ers.summary.eventCount, locale),
            },
            {
              label: copy.metrics.audit,
              value: `${formatNumber(scoreAggregate.summary.auditReadyEvents, locale)}/${formatNumber(
                scoreAggregate.summary.eventCount,
                locale,
              )}`,
            },
          ]}
          primaryAction={{
            agentRank: {
              eventType: "universe_growth",
              intent: "agentrank_action_guide_event_ledger",
              source: "fanletter_agentrank",
              starId: starId ?? null,
            },
            href: ledgerHref,
            label:
              locale === "ko"
                ? "내 평판 기록 보기"
                : "View my records",
            metadata: {
              placement: "agentrank_action_guide_primary",
            },
          }}
          reputationEventLabel={
            locale === "ko"
              ? "FanLetter 행동 → 평판 기록 → AgentRank 점수"
              : "FanLetter actions → reputation records → AgentRank score"
          }
          steps={[
            {
              label: locale === "ko" ? "FanLetter 행동" : "FanLetter actions",
              status: "done",
            },
            {
              label: locale === "ko" ? "평판 기록" : "Reputation records",
              status: "active",
            },
            {
              label: locale === "ko" ? "검증 패킷" : "Evidence packets",
              status: scoreAggregate.summary.auditReadyEvents > 0 ? "done" : "next",
            },
            {
              label: locale === "ko" ? "점수 반영" : "Score",
              status: "active",
            },
          ]}
          subtitle={
            locale === "ko"
              ? "이 화면은 투자자와 운영자가 보는 요약입니다. 실제 행동 내역은 평판 기록에서 검증합니다."
              : "This is the investor and operator summary. Verify the action history in reputation records."
          }
          title={
            locale === "ko"
              ? "다음 행동: 내 평판 기록 보기"
              : "Next action: view my records"
          }
        />
        <AgentRankMobileStatusCard
          copy={copy}
          locale={locale}
          scoreAggregate={scoreAggregate}
        />
        <AgentRankAudienceSplit
          auditReadyCount={scoreAggregate.summary.auditReadyEvents}
          eventCount={ers.summary.eventCount}
          locale={locale}
        />
        <AgentRankUserPathPanel
          eventCount={ers.summary.eventCount}
          founderNetworkHref={founderNetworkHref}
          ledgerHref={ledgerHref}
          locale={locale}
          score={scoreAggregate.score}
          starId={starId}
        />

        <section
          aria-labelledby="agentrank-investor-section-title"
          className="mt-5 hidden sm:block"
        >
          <AgentRankInvestorSectionIntro
            copy={copy}
            coverageHref={coverageHref}
            coverageQuality={coverage.phase1QualityScore}
            eventCount={ers.summary.eventCount}
            locale={locale}
            score={scoreAggregate.score}
            starId={starId}
          />

        <header className="agentrank-flow-card mt-5 hidden gap-5 rounded-[1.5rem] border border-zinc-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm font-semibold text-zinc-700">
              <Sparkles className="size-4" />
              {copy.generated} · {formatDateTime(snapshot.generatedAt, locale)}
            </div>
            <h1 className="mt-4 text-[3rem] font-semibold leading-[1.02] tracking-normal text-[#11132d] md:text-[4.4rem]">
              {copy.heroTitle}
            </h1>
            <p className="mt-2 text-2xl font-semibold text-zinc-600">
              {copy.heroSubtitle}
            </p>
            <p className="mt-3 max-w-3xl text-lg font-medium leading-8 text-slate-600">
              {copy.heroBody}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <ReadinessPill active={ers.readiness.reputationLedgerReady} label="Reputation Ledger" />
              <ReadinessPill active={ers.readiness.oracleReady} label="Oracle-ready Events" />
              <ReadinessPill active={ers.readiness.x402Ready} label={copy.x402Pending} />
              <ReadinessPill active={ers.readiness.a2aReady} label={`${copy.a2a} pending`} />
            </div>
          </div>
          <div className="agentrank-stage-card relative overflow-hidden rounded-[1.25rem] bg-gradient-to-br from-black via-zinc-900 to-zinc-700 p-5 text-white shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
            <p className="text-sm font-semibold uppercase text-white/70">
              {snapshot.positioning.phase}
            </p>
            <h2 className="mt-3 text-4xl font-semibold">
              {snapshot.positioning.mission}
            </h2>
            <p className="mt-4 text-sm font-medium leading-6 text-white/72">
              {copy.whyMatters}
            </p>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                { label: "LLM", Icon: Brain },
                { label: "MCP", Icon: Network },
                { label: "x402", Icon: WalletCards },
              ].map(({ Icon, label }) => (
                <div
                  className="rounded-lg bg-white/10 p-3 text-center ring-1 ring-white/10"
                  key={label}
                >
                  <Icon className="mx-auto size-6" />
                  <p className="mt-2 text-sm font-semibold">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </header>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-9">
          {metrics.map((metric, index) => (
            <MetricTile
              key={metric.label}
              label={metric.label}
              value={metric.value}
              style={{ animationDelay: `${index * 45}ms` }}
            />
          ))}
        </section>

        <div className="mt-5">
          <AgentRankScoreAggregatorPanel
            copy={copy}
            eventFeed={eventFeed}
            locale={locale}
            scoreAggregate={scoreAggregate}
            starId={starId}
          />
        </div>

        <div className="mt-5">
          <OracleEvidenceChainPanel
            copy={copy}
            events={eventFeed.events}
            locale={locale}
            starId={starId}
          />
        </div>

        <div className="mt-5">
          <AgentRankCoveragePanel
            backfill={backfill}
            copy={copy}
            coverage={coverage}
            locale={locale}
            starId={starId}
          />
        </div>

        <div className="mt-5">
          <TrustProblemPanel copy={copy} />
        </div>

        <div className="mt-5">
          <ProductPathPanel copy={copy} ers={ers} />
        </div>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_28rem]">
          <ErsScorePanel copy={copy} ers={ers} locale={locale} />
          <aside className="rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.07)]">
            <p className="text-sm font-semibold uppercase text-[#6d28d9]">
              {copy.roadmap}
            </p>
            <div className="mt-4 grid gap-3">
              {eventFeed.roadmap.map((step, index) => (
                <div
                  className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                  key={step}
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-[#6d28d9]">
                    {index + 1}
                  </div>
                  <p className="text-sm font-semibold text-[#11132d]">{step}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-lg border border-dashed border-violet-200 bg-violet-50 p-4">
              <p className="text-sm font-semibold text-[#4c1d95]">
                {copy.formula}
              </p>
              <p className="mt-2 text-sm font-medium leading-6 text-[#6d28d9]">
                {ers.formula}
              </p>
            </div>
          </aside>
        </section>

        <div className="mt-5">
          <EconomicActivityPanel copy={copy} />
        </div>

        <div className="mt-5">
          <EventFactoryPanel
            coverage={coverage}
            copy={copy}
            events={eventFeed.events}
            locale={locale}
          />
        </div>

        <footer className="agentrank-flow-card mt-5 overflow-hidden rounded-lg bg-[#080c2a] text-white shadow-[0_24px_70px_rgba(8,12,42,0.24)]">
          <div className="grid gap-4 border-b border-white/10 p-5 lg:grid-cols-3">
            {copy.bottomStatements.map((statement, index) => (
              <div
                className="agentrank-dark-card relative flex items-center gap-3 overflow-hidden rounded-lg bg-white/5 p-4 ring-1 ring-white/10"
                key={statement}
                style={{ animationDelay: `${index * 120}ms` }}
              >
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white text-[#4338ca]">
                  {index === 0 ? (
                    <Sparkles className="size-6" />
                  ) : index === 1 ? (
                    <Bot className="size-6" />
                  ) : (
                    <Brain className="size-6" />
                  )}
                </div>
                <p className="text-lg font-semibold leading-6">{statement}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-4 p-5 lg:grid-cols-[1fr_1fr_1fr_0.92fr]">
            {[
              {
                body: "Reputation Event Factory. Creates valuable events from human and agent activities.",
                icon: <Heart className="size-6" />,
                title: "FanLetter",
              },
              {
                body: "Reputation Infrastructure. Collects, verifies, enriches, and connects reputation data.",
                icon: <Database className="size-6" />,
                title: "MiZi (PeopleGPT)",
              },
              {
                body: "Economic Reputation Network. Calculates scores and rankings for the AI Agent economy.",
                icon: <Brain className="size-6" />,
                title: "AgentRank",
              },
            ].map((item) => (
              <div
                className="agentrank-dark-card relative overflow-hidden rounded-lg bg-white/5 p-4 ring-1 ring-white/10"
                key={item.title}
              >
                <div className="flex items-center gap-2 text-violet-200">
                  {item.icon}
                  <p className="text-xl font-semibold text-white">
                    {item.title}
                  </p>
                </div>
                <p className="mt-3 text-sm font-medium leading-6 text-white/70">
                  {item.body}
                </p>
              </div>
            ))}
            <div className="rounded-lg border border-pink-400/30 bg-gradient-to-br from-pink-500/16 to-violet-500/16 p-4">
              <p className="text-2xl font-semibold uppercase leading-tight text-pink-300">
                From data to trust.
              </p>
              <p className="mt-1 text-2xl font-semibold uppercase leading-tight text-blue-200">
                From trust to economy.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <FanletterTrackedLink
                  agentRank={{
                    eventType: "content_engaged",
                    intent: "agentrank_footer_home",
                    source: "fanletter_agentrank",
                    starId: starId ?? null,
                  }}
                  className="inline-flex min-h-10 items-center justify-center rounded-full bg-white px-4 py-2 text-center text-sm font-semibold leading-tight text-[#4338ca] [word-break:keep-all]"
                  eventName="content_open"
                  href={`/${locale}/fanletter`}
                >
                  {copy.viewHome}
                </FanletterTrackedLink>
                <FanletterTrackedLink
                  agentRank={{
                    eventType: "content_engaged",
                    intent: "agentrank_footer_founder_network",
                    source: "fanletter_agentrank",
                    starId: starId ?? null,
                  }}
                  className="inline-flex min-h-10 items-center justify-center rounded-full bg-white/12 px-4 py-2 text-center text-sm font-semibold leading-tight text-white ring-1 ring-white/20 [word-break:keep-all]"
                  eventName="content_open"
                  href={founderNetworkHref}
                >
                  {copy.viewFounderUniverse}
                </FanletterTrackedLink>
                <FanletterTrackedLink
                  agentRank={{
                    eventType: "content_engaged",
                    intent: "agentrank_footer_event_api",
                    source: "fanletter_agentrank",
                    starId: starId ?? null,
                  }}
                  className="inline-flex min-h-10 items-center justify-center rounded-full bg-white/12 px-4 py-2 text-center text-sm font-semibold leading-tight text-white ring-1 ring-white/20 [word-break:keep-all]"
                  eventName="content_open"
                  href={`/${locale}/fanletter/agentrank/events${
                    starId ? `?starId=${encodeURIComponent(starId)}` : ""
                  }`}
                >
                  {copy.viewEventsApi}
                </FanletterTrackedLink>
              </div>
            </div>
          </div>
        </footer>
        </section>
      </div>
    </main>
  );
}
