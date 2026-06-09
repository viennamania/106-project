import "server-only";

import { randomUUID } from "node:crypto";

import type { Filter } from "mongodb";

import {
  fanletterCampaignCategories,
  fanletterCampaignCharacters,
  fanletterCampaignEventTypes,
  fanletterCampaignGoalLabels,
  fanletterCampaignGoals,
  fanletterCampaignStatuses,
  type FanletterCampaignAnalysis,
  type FanletterCampaignCategory,
  type FanletterCampaignCharacter,
  type FanletterCampaignCreateRequest,
  type FanletterCampaignDocument,
  type FanletterCampaignDraft,
  type FanletterCampaignEventCreateRequest,
  type FanletterCampaignEventDocument,
  type FanletterCampaignEventRecord,
  type FanletterCampaignEventType,
  type FanletterCampaignGoal,
  type FanletterCampaignProduct,
  type FanletterCampaignRecord,
  type FanletterCampaignReport,
  type FanletterCampaignStatus,
  type FanletterCampaignsResponse,
} from "@/lib/fanletter-campaign";
import {
  getFanletterCampaignEventsCollection,
  getFanletterCampaignsCollection,
} from "@/lib/mongodb";

const DEFAULT_ADVERTISER_ID = "adv_demo";
const CAMPAIGN_PAGE_SIZE_MAX = 60;

type CategoryProfile = {
  audience: string;
  growth: string;
  motivation: string;
  risk: FanletterCampaignAnalysis["risk"];
  summary: string;
  type: string;
};

const categoryProfiles: Record<FanletterCampaignCategory, CategoryProfile> = {
  beauty: {
    audience: "2030 여성, 민감 피부 관심층, 뷰티 루틴 소비자",
    growth: "인지도 + 친밀도",
    motivation: "성분, 사용감, 전후 비교, 루틴 개선",
    risk: "notice",
    summary:
      "사용감과 루틴 설명이 중요한 상품입니다. 캐릭터의 취향과 피부 고민을 연결한 비교형 브이로그가 적합합니다.",
    type: "Review Vlog",
  },
  fashion: {
    audience: "스타일 관심층, 팬덤 소비자, 1020/2030 여성",
    growth: "인지도 + 친밀도",
    motivation: "착용 장면, 팬 선택, 시즌 스타일",
    risk: "low",
    summary:
      "캐릭터의 의상 변화와 바로 연결할 수 있습니다. 팬 투표, 새 룩 공개, 저장/공유 목표와 잘 맞습니다.",
    type: "Product Quest",
  },
  food: {
    audience: "간편식 구매자, 자취생, 직장인, 야식/간식 관심층",
    growth: "활동 + 수익력",
    motivation: "맛, 가격, 편의성, 재구매",
    risk: "low",
    summary:
      "짧은 먹방, 루틴, 팬 미션으로 전환하기 쉽습니다. 쿠폰이나 공동구매형 공유링크와 잘 맞습니다.",
    type: "Fan Mission",
  },
  goods: {
    audience: "팬덤 소비자, 굿즈 수집층, 이벤트 참여자",
    growth: "친밀도 + 수익력",
    motivation: "소장, 한정판, 팬 참여, 커뮤니티 공유",
    risk: "low",
    summary:
      "팬덤 참여와 직접 연결됩니다. 공유 목표 달성 시 새 굿즈나 팬전용 장면 해금이 자연스럽습니다.",
    type: "Fan Mission",
  },
  health: {
    audience: "루틴 관리층, 운동 관심층, 3040 건강 관심층",
    growth: "수익력 + 활동",
    motivation: "신뢰, 반복 섭취, 할인, 루틴 형성",
    risk: "high",
    summary:
      "신뢰와 표시 검수가 중요한 상품입니다. 효능 표현을 제한하고 루틴 참여형 캠페인으로 설계해야 합니다.",
    type: "Coupon Drop",
  },
  living_appliance: {
    audience: "1인 가구, 자취생, 소형가전 관심층",
    growth: "인지도 + 생활력",
    motivation: "방 업그레이드, 편의성, 선물",
    risk: "medium",
    summary:
      "자취방, 책상, 작은 침실처럼 공간이 좁은 장면에 자연스럽게 들어가는 생활 업그레이드형 상품입니다.",
    type: "Product Quest",
  },
  tech_gadget: {
    audience: "테크 얼리어답터, 남성 IT 관심층, 선물 구매자",
    growth: "서사력 + 인지도",
    motivation: "성능, 언박싱, 비교, 실사용 장면",
    risk: "medium",
    summary:
      "비교 리뷰와 언박싱 장면에 적합합니다. 캐릭터가 장비를 얻고 능력이 확장되는 구조로 만들기 좋습니다.",
    type: "Review Vlog",
  },
};

function collapseWhitespace(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function trimToLength(value: string | null | undefined, limit: number) {
  const normalized = collapseWhitespace(value);

  return normalized ? normalized.slice(0, limit) : "";
}

function normalizeCategory(
  value: string | null | undefined,
): FanletterCampaignCategory | null {
  return fanletterCampaignCategories.includes(
    value as FanletterCampaignCategory,
  )
    ? (value as FanletterCampaignCategory)
    : null;
}

function normalizeGoal(value: string | null | undefined): FanletterCampaignGoal {
  return fanletterCampaignGoals.includes(value as FanletterCampaignGoal)
    ? (value as FanletterCampaignGoal)
    : "click";
}

function normalizeStatus(value: string | null | undefined): FanletterCampaignStatus {
  if (fanletterCampaignStatuses.includes(value as FanletterCampaignStatus)) {
    return value as FanletterCampaignStatus;
  }

  throw new Error("Unsupported campaign status.");
}

function normalizeEventType(
  value: string | null | undefined,
): FanletterCampaignEventType {
  return fanletterCampaignEventTypes.includes(value as FanletterCampaignEventType)
    ? (value as FanletterCampaignEventType)
    : "click";
}

function inferFromUrl(url: string) {
  const lowered = decodeURIComponent(url || "").toLowerCase();
  const presets: Array<{
    brand: string;
    category: FanletterCampaignCategory;
    keys: string[];
    price: string;
    product: string;
  }> = [
    {
      brand: "Mellow",
      category: "beauty",
      keys: ["beauty", "cream", "serum", "skin", "cosmetic", "수분", "크림"],
      price: "32,000원",
      product: "저자극 수분크림",
    },
    {
      brand: "Daily Bite",
      category: "food",
      keys: ["food", "snack", "meal", "coffee", "간편식", "간식", "커피"],
      price: "18,900원",
      product: "오트밀 단백질 바",
    },
    {
      brand: "Routine Lab",
      category: "health",
      keys: ["health", "vitamin", "protein", "supplement", "비타민", "단백질"],
      price: "29,000원",
      product: "데일리 비타민 젤리",
    },
    {
      brand: "Mode Room",
      category: "fashion",
      keys: ["fashion", "shirt", "hoodie", "bag", "옷", "후드", "가방"],
      price: "59,000원",
      product: "라이트 후드 집업",
    },
    {
      brand: "Voltly",
      category: "tech_gadget",
      keys: ["tech", "gadget", "charger", "keyboard", "it", "충전기", "키보드"],
      price: "39,000원",
      product: "3포트 고속 충전기",
    },
    {
      brand: "Fanmade",
      category: "goods",
      keys: ["goods", "merch", "poster", "keyring", "굿즈", "키링"],
      price: "12,000원",
      product: "한정판 아크릴 키링",
    },
  ];

  return (
    presets.find((preset) => preset.keys.some((key) => lowered.includes(key))) ?? {
      brand: "Airly",
      category: "living_appliance" as const,
      price: "49,000원",
      product: "미니 공기청정기",
    }
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function scoreCharacter(
  character: FanletterCampaignCharacter,
  analysis: FanletterCampaignAnalysis,
  category: FanletterCampaignCategory,
) {
  const categoryBoost = character.categories.includes(category) ? 16 : 0;
  const goalBoost =
    analysis.goal === "live_view" && character.id === "yoonseo"
      ? 8
      : analysis.goal === "purchase" &&
          ["harin", "mina", "ido"].includes(character.id)
        ? 5
        : analysis.goal === "coupon" && ["harin", "doyun"].includes(character.id)
          ? 6
          : 0;
  const riskPenalty = analysis.risk === "high" && character.id === "yoonseo" ? -8 : 0;

  return Math.max(
    42,
    Math.min(96, character.baseScore + categoryBoost + goalBoost + riskPenalty),
  );
}

function getQuestName(category: FanletterCampaignCategory, character: FanletterCampaignCharacter) {
  const byCategory: Record<FanletterCampaignCategory, string> = {
    beauty: "루틴 실험 퀘스트",
    fashion: "새 스타일 공개 미션",
    food: "하루 충전 미션",
    goods: "팬덤 보관함 미션",
    health: "루틴 체크 미션",
    living_appliance: "방 업그레이드 퀘스트",
    tech_gadget: "장비 레벨업 퀘스트",
  };

  return byCategory[category] || `${character.role} 성장 캠페인`;
}

function getProgressDelta(eventType: FanletterCampaignEventType) {
  return {
    click: 25,
    coupon_download: 60,
    impression: 0,
    live_view: 50,
    purchase: 100,
    share: 75,
    signup: 80,
  }[eventType];
}

function serializeEvent(
  event: FanletterCampaignEventDocument,
): FanletterCampaignEventRecord {
  return {
    campaignId: event.campaignId,
    characterId: event.characterId,
    createdAt: event.createdAt.toISOString(),
    eventId: event.eventId,
    eventType: event.eventType,
    eventValue: event.eventValue,
    progressDelta: event.progressDelta,
    source: event.source,
  };
}

function aggregateEvents(events: FanletterCampaignEventDocument[]) {
  return events.reduce<FanletterCampaignReport>(
    (report, event) => {
      report.total += 1;
      report.byType[event.eventType] = (report.byType[event.eventType] ?? 0) + 1;
      report.progressCount += event.progressDelta;
      return report;
    },
    { byType: {}, progressCount: 0, total: 0 },
  );
}

async function serializeCampaign(
  campaign: FanletterCampaignDocument,
): Promise<FanletterCampaignRecord> {
  const campaignRecord = { ...campaign } as FanletterCampaignDocument & {
    _id?: unknown;
  };

  delete campaignRecord._id;
  const events = await (
    await getFanletterCampaignEventsCollection()
  )
    .find({ campaignId: campaign.campaignId })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();
  const report = aggregateEvents(events);

  return {
    ...campaignRecord,
    approvedAt: campaign.approvedAt?.toISOString() ?? null,
    createdAt: campaign.createdAt.toISOString(),
    events: events.map(serializeEvent),
    progressCount: report.progressCount,
    publishedAt: campaign.publishedAt?.toISOString() ?? null,
    report,
    updatedAt: campaign.updatedAt.toISOString(),
  };
}

async function createUniqueShareSlug(baseSlug: string) {
  const campaignsCollection = await getFanletterCampaignsCollection();
  const cleanBase = slugify(baseSlug) || `campaign-${Date.now()}`;
  let candidate = cleanBase;
  let suffix = 2;

  while (await campaignsCollection.findOne({ shareSlug: candidate })) {
    candidate = `${cleanBase}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

export function buildFanletterCampaignDraft(
  input: FanletterCampaignCreateRequest,
): FanletterCampaignDraft {
  const productUrl = trimToLength(input.productUrl, 500);

  if (!productUrl) {
    throw new Error("productUrl is required.");
  }

  const inferred = inferFromUrl(productUrl);
  const forceInfer = Boolean(input.forceInfer);
  const category =
    forceInfer || !normalizeCategory(input.category)
      ? inferred.category
      : normalizeCategory(input.category) ?? inferred.category;
  const profile = categoryProfiles[category];
  const goal = normalizeGoal(input.campaignGoal);
  const analysis: FanletterCampaignAnalysis = {
    audience: profile.audience,
    goal,
    growth: profile.growth,
    motivation: profile.motivation,
    risk: profile.risk,
    shareTarget:
      goal === "live_view" ? "300 라방 유입" : goal === "purchase" ? "50 구매" : "500 클릭",
    summary: profile.summary,
    type: profile.type,
  };
  const matches = fanletterCampaignCharacters
    .map((character) => {
      const matched = character.categories.includes(category);

      return {
        character,
        fitReason: matched
          ? `${profile.summary} ${character.role}의 성장 퀘스트로 자연스럽게 연결할 수 있습니다.`
          : `${character.name} 캐릭터는 직접 카테고리 적합도는 낮지만 팬 미션이나 쿠폰 캠페인으로 테스트 가능합니다.`,
        fitScore: scoreCharacter(character, analysis, category),
        riskNotes: analysis.risk === "high" ? "운영자 수동 검수 필요" : "일반 검수",
      };
    })
    .sort((left, right) => right.fitScore - left.fitScore);
  const selectedCharacter =
    !forceInfer && input.selectedCharacterId
      ? fanletterCampaignCharacters.find(
          (character) => character.id === input.selectedCharacterId,
        ) ?? matches[0].character
      : matches[0].character;
  const product: FanletterCampaignProduct = {
    benefit: trimToLength(input.benefitText, 140) || "혜택 입력 필요",
    brand:
      forceInfer || !trimToLength(input.brandName, 100)
        ? inferred.brand
        : trimToLength(input.brandName, 100),
    category,
    name:
      forceInfer || !trimToLength(input.productName, 120)
        ? inferred.product
        : trimToLength(input.productName, 120),
    price:
      forceInfer || !trimToLength(input.priceAmount, 60)
        ? inferred.price
        : trimToLength(input.priceAmount, 60),
    prohibitedCopy: trimToLength(input.prohibitedCopy, 500),
    requiredCopy: trimToLength(input.requiredCopy, 300),
    url: productUrl,
  };
  const questName = getQuestName(category, selectedCharacter);
  const goalPhrase =
    goal === "live_view"
      ? "라방 알림을 받고"
      : goal === "coupon"
        ? "쿠폰을 받고"
        : goal === "purchase"
          ? "상품을 확인하고"
          : "공유링크에 참여하고";
  const benefitPhrase =
    product.benefit === "혜택 입력 필요" ? "캠페인 혜택" : product.benefit;

  return {
    analysis,
    brief: {
      complianceCopy: `광고 및 AI 캐릭터 콘텐츠 표시가 필요합니다. 금지 문구: ${
        product.prohibitedCopy || "브랜드 검수 전 과장 표현 금지"
      }`,
      shareCopy: `${selectedCharacter.name}의 ${questName}에 참여하고 ${product.brand} ${product.name} ${benefitPhrase}을 확인해보세요.`,
      storyHook: `${selectedCharacter.name} 캐릭터가 ${product.name} 상품을 경험하며 ${questName}를 진행합니다. 팬들이 ${goalPhrase} 목표를 달성하면 캐릭터 성장 로그에 반영됩니다.`,
    },
    goalLabel: fanletterCampaignGoalLabels[goal],
    matches,
    product,
    questName,
    selectedCharacter,
    shareSlug: `${selectedCharacter.id}-${slugify(product.brand)}-${slugify(
      product.name,
    )}`,
  };
}

export async function createFanletterCampaign(
  input: FanletterCampaignCreateRequest,
) {
  const campaignsCollection = await getFanletterCampaignsCollection();
  const draft = buildFanletterCampaignDraft(input);
  const now = new Date();
  const campaign: FanletterCampaignDocument = {
    ...draft,
    advertiserId: trimToLength(input.advertiserId, 120) || DEFAULT_ADVERTISER_ID,
    approvedAt: null,
    campaignId: `fc_${randomUUID()}`,
    characterId: draft.selectedCharacter.id,
    createdAt: now,
    publishedAt: null,
    shareSlug: await createUniqueShareSlug(draft.shareSlug),
    status: "draft",
    updatedAt: now,
  };

  await campaignsCollection.insertOne(campaign);

  return serializeCampaign(campaign);
}

export async function listFanletterCampaigns({
  pageSize = 30,
  status,
}: {
  pageSize?: number;
  status?: string | null;
} = {}): Promise<FanletterCampaignsResponse> {
  const campaignsCollection = await getFanletterCampaignsCollection();
  const normalizedStatus = status ? normalizeStatus(status) : null;
  const filter: Filter<FanletterCampaignDocument> = normalizedStatus
    ? { status: normalizedStatus }
    : {};
  const [campaigns, counts] = await Promise.all([
    campaignsCollection
      .find(filter)
      .sort({ updatedAt: -1 })
      .limit(Math.min(CAMPAIGN_PAGE_SIZE_MAX, Math.max(1, pageSize)))
      .toArray(),
    campaignsCollection
      .aggregate<{ _id: FanletterCampaignStatus; count: number }>([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ])
      .toArray(),
  ]);
  const statusCounts = counts.reduce<
    Partial<Record<FanletterCampaignStatus, number>>
  >((result, item) => {
    result[item._id] = item.count;
    return result;
  }, {});

  return {
    campaigns: await Promise.all(campaigns.map(serializeCampaign)),
    statusCounts,
  };
}

export async function getFanletterCampaignByShareSlug(shareSlug: string) {
  const normalizedShareSlug = trimToLength(shareSlug, 160);
  const campaign = normalizedShareSlug
    ? await (await getFanletterCampaignsCollection()).findOne({
        shareSlug: normalizedShareSlug,
      })
    : null;

  return campaign ? serializeCampaign(campaign) : null;
}

export async function updateFanletterCampaignStatus({
  campaignId,
  status,
}: {
  campaignId?: string | null;
  status?: string | null;
}) {
  const normalizedCampaignId = trimToLength(campaignId, 120);
  const normalizedStatus = normalizeStatus(status);

  if (!normalizedCampaignId) {
    throw new Error("campaignId is required.");
  }

  const now = new Date();
  const update: Partial<FanletterCampaignDocument> = {
    status: normalizedStatus,
    updatedAt: now,
  };

  if (normalizedStatus === "approved" || normalizedStatus === "active") {
    update.approvedAt = now;
  }

  if (normalizedStatus === "active") {
    update.publishedAt = now;
  }

  const result = await (
    await getFanletterCampaignsCollection()
  ).findOneAndUpdate(
    { campaignId: normalizedCampaignId },
    { $set: update },
    { returnDocument: "after" },
  );

  if (!result) {
    throw new Error("Campaign not found.");
  }

  return serializeCampaign(result);
}

export async function submitFanletterCampaignForReview(campaignId?: string | null) {
  return updateFanletterCampaignStatus({
    campaignId,
    status: "pending_admin",
  });
}

export async function recordFanletterCampaignEvent({
  body,
  shareSlug,
}: {
  body: FanletterCampaignEventCreateRequest;
  shareSlug?: string | null;
}) {
  const normalizedShareSlug = trimToLength(shareSlug, 160);

  if (!normalizedShareSlug) {
    throw new Error("shareSlug is required.");
  }

  const campaignsCollection = await getFanletterCampaignsCollection();
  const campaign = await campaignsCollection.findOne({
    shareSlug: normalizedShareSlug,
  });

  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  if (campaign.status !== "active") {
    throw new Error("Campaign share link is not active.");
  }

  const eventType = normalizeEventType(body.eventType);
  const createdAt = new Date();
  const event: FanletterCampaignEventDocument = {
    campaignId: campaign.campaignId,
    characterId: campaign.characterId,
    createdAt,
    eventId: `fce_${randomUUID()}`,
    eventType,
    eventValue: Number(body.eventValue || 0),
    progressDelta: getProgressDelta(eventType),
    source: trimToLength(body.source, 80) || "share_page",
  };

  await Promise.all([
    (await getFanletterCampaignEventsCollection()).insertOne(event),
    campaignsCollection.updateOne(
      { campaignId: campaign.campaignId },
      { $set: { updatedAt: createdAt } },
    ),
  ]);

  const updatedCampaign = {
    ...campaign,
    updatedAt: createdAt,
  };

  return serializeCampaign(updatedCampaign);
}
