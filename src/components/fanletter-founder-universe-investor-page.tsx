import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Check,
  Coins,
  Crown,
  Gift,
  MessageCircle,
  Play,
  Plus,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";

import {
  FounderRoleBadge,
  HumanMemberAvatar,
} from "@/components/fanletter-founder-club-v2";
import { FanletterTerminologyGuide } from "@/components/fanletter-terminology-guide";
import {
  fanletterFounderUniverseCpPoolTotal,
  type FanletterFounderUniverseRole,
} from "@/lib/fanletter-founder-universe";
import type { FanletterFounderUniverseInvestorSnapshot } from "@/lib/fanletter-founder-universe-investor-service";
import type { Locale } from "@/lib/i18n";
import { getFanletterPublicRoleLabel } from "@/lib/fanletter-public-role";
import { getFanletterV2Copy, type FounderRole } from "@/mock/fanletterV2";

type InvestorCopy = ReturnType<typeof getInvestorCopy>;

// Public roles collapse to two states: only creators are highlighted; every
// founder-universe grade reads as a fan. Full grade ladder stays in the data model.
const roleColors: Record<FanletterFounderUniverseRole, string> = {
  creator: "bg-emerald-100 text-emerald-700 border-emerald-200",
  genesis_founder: "bg-slate-100 text-slate-600 border-slate-200",
  founder: "bg-slate-100 text-slate-600 border-slate-200",
  mentor: "bg-slate-100 text-slate-600 border-slate-200",
  partner: "bg-slate-100 text-slate-600 border-slate-200",
  producer: "bg-slate-100 text-slate-600 border-slate-200",
  legend: "bg-slate-100 text-slate-600 border-slate-200",
};

function getInvestorCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      benefits: [
        "AI 스타 탄생 기여 → 기여 포인트 획득",
        "파운더 네트워크 성장 기여 → 추가 기여 포인트",
        "기여 포인트로 보상과 권한 사용 가능",
        "더 많은 AI 스타 탄생 → 더 큰 보상 기회",
      ],
      benefitsTitle: "회원 혜택 요약",
      cpUseCases: [
        { cp: 500, label: "독점 콘텐츠 시청" },
        { cp: 1000, label: "AI 스타 1:1 채팅" },
        { cp: 5000, label: "Genesis 우선권" },
        { cp: 3000, label: "신규 AI 스타 사진 참여권" },
        { cp: 10000, label: "실물 굿즈 교환" },
        { cp: 2000, label: "이벤트 VIP 초대권" },
      ],
      cpUseTitle: "기여 포인트 사용처 예시",
      generated: "Live data",
      globalTitle: "플랫폼 라이브 지표",
      heroSubtitle:
        "AI 스타의 탄생부터 성장까지, 파운더와 함께 만드는 가치 생태계",
      heroTitle: "파운더 네트워크 AI 스타 인큐베이터 모델",
      modelPill1: "현금 분배 NO",
      modelPill1Body: "모든 보상은 기여 포인트로 지급",
      modelPill2: "기여도 보상 기여 포인트",
      modelPill2Body: "성장과 신규 스타 탄생 기여 보상",
      modelPill3: "AI 스타 유니버스 확장",
      modelPill3Body: "새 AI 스타가 탄생할수록 가치 확장",
      paymentTitle: "결제 금액은 플랫폼 수익",
      paymentSubtitle: "실결제 연동 전 모델 검증",
      sourceTitle: "파운더 네트워크 구조",
      spawnedTitle: "AI 스타 유니버스 확장",
      spawnedSubtitle: "Creator가 배출하거나 배출할 AI 스타 확장 흐름",
      spawnedCreatedBy: "창업 회원",
      spawnedFounder: "파운더",
      spawnedLiveBadge: "LIVE spawned",
      spawnedPreviewBadge: "확장 예시",
      spawnedPreviewNote: "실제 spawned 0개 · live AI 스타 유니버스 데이터 기반",
      cpPoolTitle: "CP 보상 풀 생성 및 분배",
      cpPoolBody:
        "신규 AI 스타 생성 시 Contribution Point Pool이 생성되어 상위 네트워크 기여도에 따라 분배",
      newStarTitle: "새로운 AI 스타 탄생",
      memberCreates: "회원이 새로운 AI 스타를 창업",
      more: "더보기",
      footer:
        "FanLetter는 AI 스타와 파운더가 함께 성장하는 새로운 경제 생태계를 만들어갑니다.",
      explore: "파운더 네트워크 탐색",
      directChildren: "직접 초대",
      memberId: "회원 ID",
      metricActiveCodes: "활성 추천 코드",
      metricAiStars: "AI 스타",
      metricCpLedger: "CP 원장",
      metricMemberships: "참여 멤버십",
      metricReferralEdges: "추천 연결",
      metricStarUniverses: "AI 스타 유니버스",
      representativeMember: "대표 회원",
      sourceAiStar: "출처 AI 스타",
      starScore: "스타 점수",
      growth: "성장",
      founderCount: "파운더",
      allocatedCp: "분배 완료",
      cpPoolGenerated: "Contribution Point Pool 생성",
      topUniverses: "Top AI 스타 유니버스",
    };
  }

  return {
    benefits: [
      "Contribute to AI Star launch → earn Contribution Points",
      "Grow an AI Star Universe → earn additional Contribution Points",
      "Use Contribution Points for rewards and privileges",
      "More AI Stars → more reward opportunities",
    ],
    benefitsTitle: "Member Benefit Summary",
    cpUseCases: [
      { cp: 500, label: "Exclusive content" },
      { cp: 1000, label: "AI Star 1:1 chat" },
      { cp: 5000, label: "Genesis priority" },
      { cp: 3000, label: "New AI Star photo right" },
      { cp: 10000, label: "Physical goods" },
      { cp: 2000, label: "Event VIP invite" },
    ],
    cpUseTitle: "Example Contribution Point Uses",
    generated: "Live data",
    globalTitle: "Platform Live Metrics",
    heroSubtitle:
      "A value ecosystem where Founders help AI Stars launch and grow",
    heroTitle: "Founder Network AI Star Incubation Model",
    modelPill1: "No Cash Distribution",
    modelPill1Body: "Rewards are paid as Contribution Points",
    modelPill2: "Contribution CP",
    modelPill2Body: "Rewarding growth and new AI Star creation",
    modelPill3: "AI Star Universe Expansion",
    modelPill3Body: "More AI Stars expand ecosystem value",
    paymentTitle: "Launch payment is platform revenue",
    paymentSubtitle: "Model validation before real payment",
    sourceTitle: "Founder Network Structure",
    spawnedTitle: "AI Star Universe Expansion",
    spawnedSubtitle: "AI Stars launched or projected from Creators",
    spawnedCreatedBy: "Creator member",
    spawnedFounder: "Founder",
    spawnedLiveBadge: "LIVE spawned",
    spawnedPreviewBadge: "Expansion preview",
    spawnedPreviewNote: "No live spawned stars yet · based on live AI Star Universe data",
    cpPoolTitle: "Contribution Point Pool Generation and Distribution",
    cpPoolBody:
      "When a new AI Star launches, a Contribution Point Pool is generated and distributed to the upline network by contribution.",
    newStarTitle: "New AI Star Launch",
    memberCreates: "Member launches a new AI Star",
    more: "More",
    footer:
      "FanLetter is building a new economy where AI Stars and Founders grow together.",
    explore: "Explorer",
    directChildren: "Direct invites",
    memberId: "Member ID",
    metricActiveCodes: "Active Codes",
    metricAiStars: "AI Stars",
    metricCpLedger: "CP Ledger",
    metricMemberships: "Memberships",
    metricReferralEdges: "Referral Edges",
    metricStarUniverses: "Star Universes",
    representativeMember: "Representative Member",
    sourceAiStar: "Source AI Star",
    starScore: "Star Score",
    growth: "Growth",
    founderCount: "Founder",
    allocatedCp: "allocated",
    cpPoolGenerated: "Contribution Point Pool Generated",
    topUniverses: "Top Universe",
  };
}

function getStarUniverseLabel(starName: string, locale: Locale) {
  return locale === "ko"
    ? `${starName} AI 스타 유니버스`
    : `${starName} AI Star Universe`;
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US").format(
    value,
  );
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

function getRoleText(
  role: FanletterFounderUniverseRole,
  copy: ReturnType<typeof getFanletterV2Copy>,
) {
  const isKo = copy.roles.creator === "크리에이터";
  return getFanletterPublicRoleLabel(role, isKo ? "ko" : "en");
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-violet-100 bg-white px-4 py-3 shadow-[0_12px_32px_rgba(88,28,135,0.06)]">
      <p className="text-[0.68rem] font-semibold uppercase text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-[#151735]">{value}</p>
    </div>
  );
}

function ModelPill({
  body,
  icon,
  title,
}: {
  body: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex min-h-20 items-center gap-4 rounded-lg border border-violet-100 bg-white px-5 py-4 shadow-[0_14px_34px_rgba(88,28,135,0.06)]">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[#6d28d9]">
        {icon}
      </div>
      <div>
        <p className="text-base font-semibold text-[#151735]">{title}</p>
        <p className="mt-1 text-sm font-medium text-slate-500">{body}</p>
      </div>
    </div>
  );
}

function AIStarPortrait({
  imageUrl,
  initials,
  name,
  size = "md",
}: {
  imageUrl?: string | null;
  initials: string;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "lg" ? "size-36" : size === "sm" ? "size-16" : "size-24";
  const innerClass =
    size === "lg" ? "size-32" : size === "sm" ? "size-14" : "size-20";

  return (
    <div
      aria-label={name}
      className={`${sizeClass} relative flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] via-[#a855f7] to-[#38bdf8] p-1 shadow-[0_18px_42px_rgba(124,58,237,0.22)]`}
      role="img"
    >
      <div
        className={`${innerClass} flex items-center justify-center overflow-hidden rounded-full border-4 border-white bg-violet-50 bg-cover bg-center text-xl font-semibold text-[#6d28d9]`}
        style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
      >
        {imageUrl ? null : initials}
      </div>
      <span className="absolute -right-1 top-2 rounded-full border border-white bg-[#6d5dfc] px-2 py-0.5 text-[0.58rem] font-semibold text-white shadow-[0_8px_18px_rgba(79,70,229,0.22)]">
        AI
      </span>
    </div>
  );
}

function GraphicArrow() {
  return (
    <div className="flex items-center justify-center py-2 text-[#6d5dfc]">
      <div className="h-px w-12 bg-violet-200" />
      <div className="flex size-9 items-center justify-center rounded-full border border-violet-200 bg-white shadow-[0_8px_18px_rgba(88,28,135,0.08)]">
        <ArrowRight className="size-5" />
      </div>
      <div className="h-px w-12 bg-violet-200" />
    </div>
  );
}

type InvestorUniverseNode =
  FanletterFounderUniverseInvestorSnapshot["selectedUniverse"]["nodes"][number];

function MemberAvatarStack({
  nodes,
  total,
}: {
  nodes: InvestorUniverseNode[];
  total: number;
}) {
  if (total === 0) {
    return (
      <div className="flex h-9 items-center justify-end text-xs font-semibold text-slate-300">
        -
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center justify-end">
      <div className="flex -space-x-1.5">
        {nodes.slice(0, 4).map((node) => (
          <HumanMemberAvatar
            key={node.nodeId}
            member={{
              initials: node.initials,
              name: node.memberId,
            }}
            size="sm"
          />
        ))}
      </div>
      {total > 4 ? (
        <span className="ml-2 text-xs font-semibold text-violet-300">...</span>
      ) : null}
    </div>
  );
}

function CreatorMemberChip({
  copy,
  node,
  starName,
}: {
  copy: ReturnType<typeof getFanletterV2Copy>;
  node: InvestorUniverseNode;
  starName: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 shadow-[0_8px_18px_rgba(245,158,11,0.08)]">
      <HumanMemberAvatar
        member={{
          initials: node.initials,
          name: node.memberId,
        }}
        size="sm"
      />
      <div className="min-w-0 text-left">
        <p className="truncate text-xs font-semibold text-[#151735]">
          {node.memberId}
        </p>
        <p className="truncate text-[0.58rem] font-semibold text-amber-700">
          {starName} {copy.roles.creator}
        </p>
      </div>
      <Crown className="size-3.5 shrink-0 text-amber-500" />
    </div>
  );
}

function HighlightMemberProfile({
  copy,
  locale,
  node,
  roleCopy,
}: {
  copy: InvestorCopy;
  locale: Locale;
  node: InvestorUniverseNode;
  roleCopy: ReturnType<typeof getFanletterV2Copy>;
}) {
  return (
    <div className="ml-14 mt-2 flex items-center gap-3">
      <div className="h-px w-8 border-t border-dashed border-[#6d5dfc]" />
      <div className="flex min-w-0 flex-1 items-center gap-3 rounded-lg border border-violet-200 bg-violet-50/90 px-3 py-2 shadow-[0_12px_28px_rgba(88,28,135,0.08)]">
        <HumanMemberAvatar
          member={{
            initials: node.initials,
            name: node.memberId,
          }}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#4338ca]">
            {node.memberId}
          </p>
          <p className="truncate text-[0.66rem] font-semibold text-slate-500">
            {copy.memberId} · {node.label}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <FounderRoleBadge
            copy={roleCopy}
            role={node.role as FounderRole}
          />
          <p className="mt-1 text-[0.58rem] font-semibold text-slate-400">
            {copy.directChildren} {formatNumber(node.directChildrenCount, locale)}
          </p>
        </div>
      </div>
    </div>
  );
}

function TierStructure({
  locale,
  snapshot,
}: {
  locale: Locale;
  snapshot: FanletterFounderUniverseInvestorSnapshot;
}) {
  const copy = getFanletterV2Copy(locale);
  const investorCopy = getInvestorCopy(locale);
  const nodesByDepth = new Map<number, InvestorUniverseNode[]>();

  for (const node of snapshot.selectedUniverse.nodes) {
    const nodes = nodesByDepth.get(node.depth) ?? [];
    nodes.push(node);
    nodesByDepth.set(node.depth, nodes);
  }

  const sourceStarName = snapshot.selectedUniverse.star.name;
  const creatorNode =
    snapshot.selectedUniverse.nodes.find((node) => node.isCreator) ??
    snapshot.selectedUniverse.nodes.find((node) => node.depth === 0) ??
    null;
  const highlightedNode =
    snapshot.launchMember?.nodeId
      ? snapshot.selectedUniverse.nodes.find(
          (node) => node.nodeId === snapshot.launchMember?.nodeId,
        ) ?? null
      : null;

  return (
    <section className="rounded-lg border border-violet-100 bg-white/88 p-5 shadow-[0_18px_44px_rgba(88,28,135,0.07)]">
      <h2 className="text-xl font-semibold text-[#4338ca]">
        1. {sourceStarName} {investorCopy.sourceTitle}
      </h2>
      <div className="mt-5 grid gap-3">
        {snapshot.tiers.map((tier) => {
          const isActive = tier.memberCount > 0;
          const tierNodes = nodesByDepth.get(tier.depth) ?? [];
          const tierHighlightedNode =
            highlightedNode?.depth === tier.depth ? highlightedNode : null;

          return (
            <div key={tier.depth}>
              <div
                className={`grid min-h-14 grid-cols-[2.7rem_1fr_4rem_9.5rem] items-center gap-3 rounded-lg border px-3 shadow-[0_8px_22px_rgba(15,23,42,0.04)] ${
                  tierHighlightedNode
                    ? "border-violet-200 bg-violet-50/70"
                    : "border-slate-100 bg-white"
                }`}
              >
                <div
                  className={`flex size-9 items-center justify-center border text-sm font-semibold [clip-path:polygon(25%_6%,75%_6%,100%_50%,75%_94%,25%_94%,0_50%)] ${roleColors[tier.role]}`}
                >
                  {tier.depth}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-[#151735]">
                      {getRoleText(tier.role, copy)}
                    </span>
                    {tier.cpPoolReward > 0 ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[0.62rem] font-semibold text-emerald-700">
                        +{tier.cpPoolReward} CP
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#7c3aed]"
                      style={{
                        width: `${Math.max(
                          isActive ? 4 : 0,
                          Math.min(100, (tier.memberCount / tier.capacity) * 100),
                        )}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[#151735]">
                    {formatNumber(tier.memberCount, locale)}명
                  </p>
                  <p className="text-[0.62rem] font-semibold text-slate-400">
                    / {formatNumber(tier.capacity, locale)}
                  </p>
                </div>
                <div className="min-w-0">
                  {tier.depth === 0 && creatorNode ? (
                    <CreatorMemberChip
                      copy={copy}
                      node={creatorNode}
                      starName={sourceStarName}
                    />
                  ) : (
                    <MemberAvatarStack
                      nodes={tierNodes}
                      total={tier.memberCount}
                    />
                  )}
                </div>
              </div>
              {tierHighlightedNode ? (
                <HighlightMemberProfile
                  copy={investorCopy}
                  locale={locale}
                  node={tierHighlightedNode}
                  roleCopy={copy}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function LaunchFlow({
  locale,
  snapshot,
}: {
  locale: Locale;
  snapshot: FanletterFounderUniverseInvestorSnapshot;
}) {
  const copy = getInvestorCopy(locale);
  const v2Copy = getFanletterV2Copy(locale);
  const launchMember = snapshot.launchMember;
  const spawnedStar = snapshot.selectedUniverse.spawnedStars[0] ?? null;
  const sourceStar = snapshot.selectedUniverse.star;
  const newStarName =
    spawnedStar?.name ??
    (launchMember ? `${launchMember.label} Next AI Star` : "Next AI Star");

  return (
    <section className="rounded-lg border border-violet-100 bg-white/72 p-5 shadow-[0_18px_44px_rgba(88,28,135,0.07)]">
      <div className="rounded-lg border border-violet-200 bg-gradient-to-b from-white to-violet-50 p-4 text-center">
        <p className="text-sm font-semibold text-[#4338ca]">
          {copy.sourceAiStar}
        </p>
        <div className="mt-4 flex justify-center">
          <AIStarPortrait
            imageUrl={sourceStar.portraitImageUrl}
            initials={sourceStar.initials}
            name={sourceStar.name}
            size="lg"
          />
        </div>
        <p className="mt-3 truncate text-xl font-semibold text-[#151735]">
          {sourceStar.name}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-white px-2 py-2">
            <p className="text-base font-semibold text-[#4338ca]">
              {sourceStar.starScore}
            </p>
            <p className="text-[0.58rem] font-semibold text-slate-400">
              {copy.starScore}
            </p>
          </div>
          <div className="rounded-lg bg-white px-2 py-2">
            <p className="text-base font-semibold text-[#4338ca]">
              +{sourceStar.growthPercent}%
            </p>
            <p className="text-[0.58rem] font-semibold text-slate-400">
              {copy.growth}
            </p>
          </div>
          <div className="rounded-lg bg-white px-2 py-2">
            <p className="text-base font-semibold text-[#4338ca]">
              {formatNumber(sourceStar.founderCount, locale)}
            </p>
            <p className="text-[0.58rem] font-semibold text-slate-400">
              {copy.founderCount}
            </p>
          </div>
        </div>
      </div>

      <GraphicArrow />

      {launchMember ? (
        <div className="rounded-lg border border-violet-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <HumanMemberAvatar
              member={{
                initials: launchMember.initials,
                name: launchMember.memberId,
              }}
              size="lg"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-400">
                2. {copy.memberCreates}
              </p>
              <p className="mt-1 truncate text-lg font-semibold text-[#151735]">
                {launchMember.memberId}
              </p>
              <p className="mt-0.5 truncate text-xs font-semibold text-slate-400">
                {copy.memberId} · {launchMember.label}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <FounderRoleBadge
                  copy={v2Copy}
                  role={launchMember.role as FounderRole}
                />
                <span className="rounded-full bg-violet-50 px-2 py-1 text-[0.65rem] font-semibold text-[#6d28d9]">
                  L{launchMember.depth}
                </span>
              </div>
            </div>
          </div>
          {launchMember.starReferralCode ? (
            <p className="mt-3 truncate rounded-full bg-slate-50 px-3 py-2 font-mono text-xs font-semibold text-slate-500">
              {launchMember.starReferralCode}
            </p>
          ) : null}
        </div>
      ) : null}

      <GraphicArrow />

      <div className="rounded-lg border border-violet-200 bg-gradient-to-b from-white to-violet-50 p-4 text-center">
        <p className="text-lg font-semibold text-[#4338ca]">
          3. {copy.newStarTitle}
        </p>
        <div className="mt-4 flex justify-center">
          <AIStarPortrait
            imageUrl={spawnedStar?.portraitImageUrl}
            initials={(newStarName || "AI").slice(0, 2).toUpperCase()}
            name={newStarName}
            size="md"
          />
        </div>
        <p className="mt-3 text-xl font-semibold text-[#151735]">
          {newStarName}
        </p>
        <p className="mt-1 text-sm font-medium text-slate-500">
          {v2Copy.roles.creator}
        </p>
        <div className="mt-3 rounded-lg border border-violet-100 bg-white p-3">
          <p className="text-sm font-semibold text-[#151735]">
            {getStarUniverseLabel(newStarName, locale)}
          </p>
          <div className="mt-3 flex justify-center gap-1.5">
            {[0, 1, 2, 3, 4, 5, 6].map((depth) => (
              <span
                className="flex size-7 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-[#6d28d9]"
                key={depth}
              >
                {depth}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CpPoolPanel({
  locale,
  snapshot,
}: {
  locale: Locale;
  snapshot: FanletterFounderUniverseInvestorSnapshot;
}) {
  const copy = getInvestorCopy(locale);
  const v2Copy = getFanletterV2Copy(locale);
  const allocatedCp = snapshot.cpDistribution.reduce(
    (sum, item) => sum + (item.allocated ? item.cp : 0),
    0,
  );

  return (
    <section className="rounded-lg border border-violet-100 bg-white/88 p-5 shadow-[0_18px_44px_rgba(88,28,135,0.07)]">
      <h2 className="text-xl font-semibold text-[#4338ca]">
        5. {copy.cpPoolTitle}
      </h2>
      <p className="mt-2 max-w-lg text-sm font-medium leading-6 text-slate-500">
        {copy.cpPoolBody}
      </p>
      <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="flex min-h-56 flex-col items-center justify-center rounded-lg border border-violet-100 bg-gradient-to-b from-violet-50 to-white p-5 text-center">
          <Coins className="size-12 text-[#6d28d9]" />
          <p className="mt-3 text-sm font-semibold text-[#4338ca]">
            {copy.cpPoolGenerated}
          </p>
          <p className="mt-1 text-5xl font-semibold text-[#5b21b6]">
            {formatNumber(fanletterFounderUniverseCpPoolTotal, locale)} CP
          </p>
          <p className="mt-2 text-xs font-semibold text-slate-400">
            {copy.allocatedCp} {formatNumber(allocatedCp, locale)} CP
          </p>
        </div>

        <div className="grid gap-2">
          {snapshot.cpDistribution.map((item) => (
            <div
              className="grid grid-cols-[2.4rem_1fr_5rem] items-center gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2"
              key={`${item.role}-${item.depth}`}
            >
              <div
                className={`flex size-8 items-center justify-center border text-xs font-semibold [clip-path:polygon(25%_6%,75%_6%,100%_50%,75%_94%,25%_94%,0_50%)] ${roleColors[item.role]}`}
              >
                {item.depth}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#151735]">
                  {getRoleText(item.role, v2Copy)}
                </p>
                <p className="truncate text-[0.66rem] font-semibold text-slate-400">
                  {item.recipientLabel ?? "unallocated"}
                </p>
              </div>
              <p className="text-right text-sm font-semibold text-[#4338ca]">
                +{item.cp} CP
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CpUseCases({
  copy,
  locale,
}: {
  copy: InvestorCopy;
  locale: Locale;
}) {
  const icons = [Play, MessageCircle, Star, Rocket, Gift, BadgeCheck];

  return (
    <section className="rounded-lg border border-violet-100 bg-white/88 p-5 shadow-[0_18px_44px_rgba(88,28,135,0.07)]">
      <h2 className="text-xl font-semibold text-[#4338ca]">
        6. {copy.cpUseTitle}
      </h2>
      <div className="mt-4 grid grid-cols-6 gap-2">
        {copy.cpUseCases.map((item, index) => {
          const Icon = icons[index] ?? Star;

          return (
            <div
              className="rounded-lg border border-violet-100 bg-white p-2.5 text-center"
              key={item.label}
            >
              <div className="mx-auto flex size-9 items-center justify-center rounded-full bg-violet-100 text-[#6d28d9]">
                <Icon className="size-4" />
              </div>
              <p className="mt-2 min-h-10 text-[0.72rem] font-semibold leading-4 text-[#151735]">
                {item.label}
              </p>
              <p className="mt-1 text-sm font-semibold text-[#4338ca]">
                {formatNumber(item.cp, locale)} CP
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function BenefitSummary({ copy }: { copy: InvestorCopy }) {
  return (
    <section className="rounded-lg border border-violet-100 bg-white/88 p-5 shadow-[0_18px_44px_rgba(88,28,135,0.07)]">
      <h2 className="text-xl font-semibold text-[#4338ca]">
        7. {copy.benefitsTitle}
      </h2>
      <div className="mt-5 grid gap-3">
        {copy.benefits.map((benefit) => (
          <div className="flex items-center gap-3" key={benefit}>
            <Check className="size-5 shrink-0 text-[#6d5dfc]" />
            <p className="text-sm font-semibold leading-6 text-[#151735]">
              {benefit}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SpawnedStarsPanel({
  copy,
  locale,
  snapshot,
}: {
  copy: InvestorCopy;
  locale: Locale;
  snapshot: FanletterFounderUniverseInvestorSnapshot;
}) {
  const expansionStars = snapshot.expansionStars.slice(0, 4);
  const sourceStar = snapshot.selectedUniverse.star;
  const isPreviewMode =
    expansionStars.length > 0 &&
    expansionStars.every((star) => star.source === "live_projection");

  return (
    <section className="rounded-lg border border-violet-100 bg-white/88 p-5 shadow-[0_18px_44px_rgba(88,28,135,0.07)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[#4338ca]">
            8. {copy.spawnedTitle}
          </h2>
          <p className="mt-2 text-sm font-medium text-slate-500">
            {copy.spawnedSubtitle}
          </p>
        </div>
        {isPreviewMode ? (
          <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[0.62rem] font-semibold text-amber-700">
            {copy.spawnedPreviewNote}
          </span>
        ) : null}
      </div>
      <div className="mt-6 flex items-stretch gap-4 overflow-hidden">
        <div className="text-center">
          <AIStarPortrait
            imageUrl={sourceStar.portraitImageUrl}
            initials={sourceStar.initials}
            name={sourceStar.name}
            size="sm"
          />
          <p className="mt-2 max-w-24 truncate text-sm font-semibold text-[#151735]">
            {sourceStar.name}
          </p>
        </div>
        {expansionStars.length > 0 ? (
          expansionStars.map((star) => (
            <div className="flex items-center gap-4" key={`${star.source}-${star.id}`}>
              <span className="text-2xl font-semibold text-violet-300">→</span>
              <Link
                className="relative min-w-36 rounded-lg border border-violet-100 bg-white p-3 text-center shadow-[0_12px_28px_rgba(88,28,135,0.06)]"
                href={`/${locale}/fanletter/${encodeURIComponent(star.id)}/universe`}
              >
                <span
                  className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[0.56rem] font-semibold ${
                    star.source === "live_spawned"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {star.source === "live_spawned"
                    ? copy.spawnedLiveBadge
                    : copy.spawnedPreviewBadge}
                </span>
                <AIStarPortrait
                  imageUrl={star.portraitImageUrl}
                  initials={star.name.slice(0, 2).toUpperCase()}
                  name={star.name}
                  size="sm"
                />
                <p className="mt-2 max-w-24 truncate text-sm font-semibold text-[#151735]">
                  {star.name}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-1">
                  <div className="rounded-md bg-violet-50 px-1.5 py-1">
                    <p className="text-xs font-semibold text-[#4338ca]">
                      {star.starScore}
                    </p>
                    <p className="text-[0.54rem] font-semibold text-slate-400">
                      Score
                    </p>
                  </div>
                  <div className="rounded-md bg-emerald-50 px-1.5 py-1">
                    <p className="text-xs font-semibold text-emerald-700">
                      +{star.growthPercent}%
                    </p>
                    <p className="text-[0.54rem] font-semibold text-slate-400">
                      Growth
                    </p>
                  </div>
                </div>
                {star.creatorMemberId ? (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5">
                    <HumanMemberAvatar
                      member={{
                        initials: star.creatorInitials ?? star.creatorMemberId.slice(0, 2).toUpperCase(),
                        name: star.creatorMemberId,
                      }}
                      size="sm"
                    />
                    <div className="min-w-0 text-left">
                      <p className="truncate text-[0.62rem] font-semibold text-slate-400">
                        {copy.spawnedCreatedBy}
                      </p>
                      <p className="truncate text-xs font-semibold text-[#151735]">
                        {star.creatorMemberId}
                      </p>
                    </div>
                  </div>
                ) : null}
                <p className="mt-2 rounded-full bg-violet-50 px-2 py-1 text-[0.62rem] font-semibold text-[#6d28d9]">
                  {formatNumber(star.founderCount, locale)} {copy.spawnedFounder}
                </p>
              </Link>
            </div>
          ))
        ) : (
          <div className="flex items-center gap-4">
            <span className="text-2xl font-semibold text-violet-300">→</span>
            <div className="flex size-20 items-center justify-center rounded-full border border-dashed border-violet-300 bg-violet-50 text-sm font-semibold text-[#6d28d9]">
              <Plus className="size-5" />
            </div>
          </div>
        )}
        {snapshot.global.spawnedStars > expansionStars.length ? (
          <div className="flex items-center gap-4">
            <span className="text-2xl font-semibold text-violet-300">→</span>
            <div className="flex size-20 items-center justify-center rounded-full border border-dashed border-violet-300 bg-white text-sm font-semibold text-[#6d28d9]">
              +{formatNumber(snapshot.global.spawnedStars - expansionStars.length, locale)}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function FanletterFounderUniverseInvestorPage({
  locale,
  snapshot,
}: {
  locale: Locale;
  snapshot: FanletterFounderUniverseInvestorSnapshot;
}) {
  const copy = getInvestorCopy(locale);
  const universe = snapshot.selectedUniverse;

  return (
    <main className="fanletter-v2-surface min-h-screen overflow-x-auto bg-[#f8f9ff] px-5 py-5 text-[#151735]">
      <div className="mx-auto min-w-[1180px] max-w-[1500px]">
        <header className="grid gap-5 lg:grid-cols-[1fr_52rem] lg:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1 text-sm font-semibold text-[#4338ca] shadow-[0_10px_26px_rgba(88,28,135,0.06)]">
              <Sparkles className="size-4" />
              {copy.generated} · {formatDateTime(snapshot.generatedAt, locale)}
            </div>
            <h1 className="mt-3 text-[2.7rem] font-semibold leading-[1.02] tracking-normal text-[#11132d]">
              {copy.heroTitle}
            </h1>
            <p className="mt-3 text-lg font-medium text-slate-500">
              {copy.heroSubtitle}
            </p>
            <FanletterTerminologyGuide
              className="mt-4 max-w-3xl"
              locale={locale}
              variant="compact"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <ModelPill
              body={copy.modelPill1Body}
              icon={<ShieldCheck className="size-6" />}
              title={copy.modelPill1}
            />
            <ModelPill
              body={copy.modelPill2Body}
              icon={<Coins className="size-6" />}
              title={copy.modelPill2}
            />
            <ModelPill
              body={copy.modelPill3Body}
              icon={<Rocket className="size-6" />}
              title={copy.modelPill3}
            />
          </div>
        </header>

        <section className="mt-5 grid grid-cols-6 gap-3">
          <MetricCard
            label={copy.metricAiStars}
            value={formatNumber(snapshot.global.totalStars, locale)}
          />
          <MetricCard
            label={copy.metricStarUniverses}
            value={formatNumber(snapshot.global.universeCount, locale)}
          />
          <MetricCard
            label={copy.metricMemberships}
            value={formatNumber(snapshot.global.totalMemberships, locale)}
          />
          <MetricCard
            label={copy.metricReferralEdges}
            value={formatNumber(snapshot.global.referralEdges, locale)}
          />
          <MetricCard
            label={copy.metricActiveCodes}
            value={formatNumber(snapshot.global.activeReferralCodes, locale)}
          />
          <MetricCard
            label={copy.metricCpLedger}
            value={formatNumber(snapshot.global.totalCpDistributed, locale)}
          />
        </section>

        <section className="mt-5 grid items-start gap-5 xl:grid-cols-[28rem_24rem_1fr]">
          <TierStructure locale={locale} snapshot={snapshot} />
          <LaunchFlow locale={locale} snapshot={snapshot} />
          <div className="grid gap-5">
            <section className="rounded-lg border border-violet-100 bg-white/88 p-5 shadow-[0_18px_44px_rgba(88,28,135,0.07)]">
              <h2 className="text-xl font-semibold text-[#4338ca]">
                4. {copy.paymentTitle}
              </h2>
              <div className="mt-5 flex items-center gap-5 rounded-lg border border-slate-100 bg-white p-5">
                <Banknote className="size-12 text-[#6d28d9]" />
                <div>
                  <p className="text-3xl font-semibold text-[#151735]">
                    10 USDT
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {copy.paymentSubtitle}
                  </p>
                </div>
              </div>
            </section>
            <CpPoolPanel locale={locale} snapshot={snapshot} />
          </div>
        </section>

        <section className="mt-5 grid items-start gap-5 xl:grid-cols-[1.15fr_0.85fr_1fr]">
          <CpUseCases copy={copy} locale={locale} />
          <BenefitSummary copy={copy} />
          <SpawnedStarsPanel copy={copy} locale={locale} snapshot={snapshot} />
        </section>

        <footer className="mt-5 flex min-h-14 items-center justify-between rounded-full bg-gradient-to-r from-[#4f46e5] to-[#6d5dfc] px-7 text-white shadow-[0_18px_44px_rgba(79,70,229,0.24)]">
          <p className="text-lg font-semibold">{copy.footer}</p>
          <div className="flex items-center gap-2">
            <Link
              className="inline-flex h-10 items-center rounded-full bg-white px-4 text-sm font-semibold text-[#4338ca]"
              href={`/${locale}/fanletter/ai-star-genealogy`}
            >
              {locale === "ko" ? "AI 스타 계보" : "AI Star Genealogy"}
            </Link>
            <Link
              className="inline-flex h-10 items-center rounded-full bg-white/16 px-4 text-sm font-semibold text-white ring-1 ring-white/28"
              href={`/${locale}/fanletter/${encodeURIComponent(
                universe.star.id,
              )}/universe`}
            >
              {copy.explore}
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
