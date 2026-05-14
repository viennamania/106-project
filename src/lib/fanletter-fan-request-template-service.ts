import "server-only";

import type { AnyBulkWriteOperation, Filter } from "mongodb";

import type {
  FanletterFanRequestTemplateCategory,
  FanletterFanRequestTemplateDocument,
  FanletterFanRequestTemplateRecord,
  FanletterFanRequestType,
} from "@/lib/content";
import { fanletterFanRequestTypes } from "@/lib/content";
import type { Locale } from "@/lib/i18n";
import { defaultLocale } from "@/lib/i18n";
import { normalizeReferralCode } from "@/lib/member";
import { getFanletterFanRequestTemplatesCollection } from "@/lib/mongodb";

type DefaultFanRequestTemplate = {
  body: string;
  category: FanletterFanRequestTemplateCategory;
  locale: Locale;
  requestType: FanletterFanRequestType;
  sortOrder: number;
  templateId: string;
  title: string;
};

const DEFAULT_TEMPLATE_LIMIT = 18;

const DEFAULT_TEMPLATES = [
  {
    body: "카페에서 영어 공부하고 팬 질문에 짧게 답하는 하루 브이로그를 보고 싶어요.",
    category: "daily",
    locale: "ko",
    requestType: "vlog_request",
    sortOrder: 10,
    templateId: "global-ko-daily-cafe-study",
    title: "카페 공부 브이로그",
  },
  {
    body: "새 의상으로 오늘의 기분과 팬 질문에 답하는 브이로그를 보고 싶어요.",
    category: "outfit",
    locale: "ko",
    requestType: "vlog_request",
    sortOrder: 20,
    templateId: "global-ko-outfit-fan-qa",
    title: "새 의상 Q&A",
  },
  {
    body: "비 오는 날 산책하면서 플레이리스트와 하루 생각을 들려주는 브이로그를 보고 싶어요.",
    category: "seasonal",
    locale: "ko",
    requestType: "vlog_request",
    sortOrder: 30,
    templateId: "global-ko-seasonal-rain-walk",
    title: "비 오는 날 산책",
  },
  {
    body: "아침 루틴, 준비 과정, 오늘의 작은 목표를 보여주는 브이로그를 보고 싶어요.",
    category: "routine",
    locale: "ko",
    requestType: "vlog_request",
    sortOrder: 40,
    templateId: "global-ko-routine-morning",
    title: "아침 루틴",
  },
  {
    body: "팬에게 고마운 마음을 전하면서 짧은 리액션과 미소 컷이 있는 브이로그를 보고 싶어요.",
    category: "fanservice",
    locale: "ko",
    requestType: "vlog_request",
    sortOrder: 50,
    templateId: "global-ko-fanservice-reaction",
    title: "팬 리액션",
  },
  {
    body: "요즘 가장 좋아하는 음식, 음악, 장소를 답하는 Q&A 브이로그를 보고 싶어요.",
    category: "qna",
    locale: "ko",
    requestType: "vlog_request",
    sortOrder: 60,
    templateId: "global-ko-qna-favorites",
    title: "취향 Q&A",
  },
  {
    body: "항상 응원하고 있어요. 다음 브이로그도 기대할게요.",
    category: "message",
    locale: "ko",
    requestType: "message",
    sortOrder: 110,
    templateId: "global-ko-message-support",
    title: "응원 메시지",
  },
  {
    body: "오늘 콘텐츠가 좋았어요. 캐릭터 분위기가 더 선명해지는 느낌이에요.",
    category: "message",
    locale: "ko",
    requestType: "message",
    sortOrder: 120,
    templateId: "global-ko-message-feedback",
    title: "콘텐츠 피드백",
  },
  {
    body: "I want to see a vlog where you study English at a cafe and answer a few fan questions.",
    category: "daily",
    locale: "en",
    requestType: "vlog_request",
    sortOrder: 10,
    templateId: "global-en-daily-cafe-study",
    title: "Cafe study vlog",
  },
  {
    body: "I want to see a new-outfit vlog with quick answers to fan questions.",
    category: "outfit",
    locale: "en",
    requestType: "vlog_request",
    sortOrder: 20,
    templateId: "global-en-outfit-fan-qa",
    title: "New outfit Q&A",
  },
  {
    body: "I want to see a rainy-day walk vlog with your playlist and thoughts from the day.",
    category: "seasonal",
    locale: "en",
    requestType: "vlog_request",
    sortOrder: 30,
    templateId: "global-en-seasonal-rain-walk",
    title: "Rainy-day walk",
  },
  {
    body: "I want to see your morning routine, getting-ready moments, and one small goal for the day.",
    category: "routine",
    locale: "en",
    requestType: "vlog_request",
    sortOrder: 40,
    templateId: "global-en-routine-morning",
    title: "Morning routine",
  },
  {
    body: "I want a fan-reaction vlog with a warm thank-you message, smile cuts, and a short reply moment.",
    category: "fanservice",
    locale: "en",
    requestType: "vlog_request",
    sortOrder: 50,
    templateId: "global-en-fanservice-reaction",
    title: "Fan reaction",
  },
  {
    body: "I want a Q&A vlog about your favorite food, music, and place lately.",
    category: "qna",
    locale: "en",
    requestType: "vlog_request",
    sortOrder: 60,
    templateId: "global-en-qna-favorites",
    title: "Favorites Q&A",
  },
  {
    body: "I am cheering for you. I am looking forward to the next vlog.",
    category: "message",
    locale: "en",
    requestType: "message",
    sortOrder: 110,
    templateId: "global-en-message-support",
    title: "Support message",
  },
  {
    body: "I enjoyed this content. The character mood feels clearer with each vlog.",
    category: "message",
    locale: "en",
    requestType: "message",
    sortOrder: 120,
    templateId: "global-en-message-feedback",
    title: "Content feedback",
  },
] satisfies DefaultFanRequestTemplate[];

let defaultTemplateSeedPromise: Promise<void> | null = null;

function resolveTemplateLocale(locale: Locale): Locale {
  return locale === "ko" ? "ko" : "en";
}

function normalizeRequestType(
  requestType: string | null | undefined,
): FanletterFanRequestType {
  return fanletterFanRequestTypes.includes(requestType as FanletterFanRequestType)
    ? (requestType as FanletterFanRequestType)
    : "vlog_request";
}

function serializeFanRequestTemplate(
  template: FanletterFanRequestTemplateDocument,
): FanletterFanRequestTemplateRecord {
  return {
    body: template.body,
    category: template.category,
    creatorReferralCode: template.creatorReferralCode,
    locale: template.locale,
    requestType: template.requestType,
    templateId: template.templateId,
    title: template.title,
    usageCount: template.usageCount,
  };
}

async function ensureDefaultFanRequestTemplates() {
  if (!defaultTemplateSeedPromise) {
    defaultTemplateSeedPromise = (async () => {
      const collection = await getFanletterFanRequestTemplatesCollection();
      const now = new Date();
      const operations = DEFAULT_TEMPLATES.map(
        (template): AnyBulkWriteOperation<FanletterFanRequestTemplateDocument> => ({
          updateOne: {
            filter: { templateId: template.templateId },
            update: {
              $set: {
                body: template.body,
                category: template.category,
                creatorReferralCode: null,
                locale: template.locale,
                requestType: template.requestType,
                sortOrder: template.sortOrder,
                status: "active",
                title: template.title,
                updatedAt: now,
              },
              $setOnInsert: {
                createdAt: now,
                templateId: template.templateId,
                usageCount: 0,
              },
            },
            upsert: true,
          },
        }),
      );

      if (operations.length > 0) {
        await collection.bulkWrite(operations, { ordered: false });
      }
    })();
  }

  return defaultTemplateSeedPromise;
}

export async function listFanletterFanRequestTemplates({
  creatorReferralCode,
  locale = defaultLocale,
  requestType,
}: {
  creatorReferralCode?: string | null;
  locale?: Locale;
  requestType?: string | null;
}) {
  await ensureDefaultFanRequestTemplates();

  const collection = await getFanletterFanRequestTemplatesCollection();
  const normalizedReferralCode = normalizeReferralCode(creatorReferralCode);
  const normalizedLocale = resolveTemplateLocale(locale);
  const normalizedRequestType = normalizeRequestType(requestType);
  const creatorFilter = normalizedReferralCode
    ? [{ creatorReferralCode: normalizedReferralCode }, { creatorReferralCode: null }]
    : [{ creatorReferralCode: null }];
  const filter: Filter<FanletterFanRequestTemplateDocument> = {
    $or: creatorFilter,
    locale: normalizedLocale,
    requestType: normalizedRequestType,
    status: "active",
  };
  const templates = await collection
    .find(filter)
    .sort({ creatorReferralCode: -1, sortOrder: 1, usageCount: -1, updatedAt: -1 })
    .limit(DEFAULT_TEMPLATE_LIMIT)
    .toArray();

  return {
    templates: templates.map(serializeFanRequestTemplate),
  };
}

export async function resolveFanletterFanRequestTemplateForSubmission({
  requestType,
  templateId,
}: {
  requestType: FanletterFanRequestType;
  templateId?: string | null;
}) {
  const normalizedTemplateId = templateId?.trim().slice(0, 120);

  if (!normalizedTemplateId) {
    return null;
  }

  await ensureDefaultFanRequestTemplates();

  const collection = await getFanletterFanRequestTemplatesCollection();

  return collection.findOne({
    requestType,
    status: "active",
    templateId: normalizedTemplateId,
  });
}

export async function incrementFanletterFanRequestTemplateUsage(
  templateId: string | null | undefined,
) {
  const normalizedTemplateId = templateId?.trim().slice(0, 120);

  if (!normalizedTemplateId) {
    return;
  }

  const collection = await getFanletterFanRequestTemplatesCollection();

  await collection.updateOne(
    { templateId: normalizedTemplateId },
    {
      $inc: { usageCount: 1 },
      $set: { updatedAt: new Date() },
    },
  );
}
