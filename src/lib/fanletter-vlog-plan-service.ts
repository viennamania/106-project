import "server-only";

import { randomUUID } from "crypto";

import type {
  FanletterVlogPlanDocument,
  FanletterVlogPlanItem,
  FanletterVlogPlanStatus,
} from "@/lib/content";
import { normalizeEmail } from "@/lib/member";
import { getFanletterVlogPlansCollection } from "@/lib/mongodb";

const PLAN_QUERY_LIMIT = 14;

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function serializeDate(value?: Date | null) {
  return value ? value.toISOString() : null;
}

export function serializeFanletterVlogPlan(
  document: FanletterVlogPlanDocument,
): FanletterVlogPlanItem {
  return {
    captionHook: document.captionHook,
    checklist: document.checklist,
    contentId: document.contentId ?? null,
    dayLabel: document.dayLabel,
    distributedAt: serializeDate(document.distributedAt),
    generatedAt: document.generatedAt.toISOString(),
    id: document.planId,
    mediaMode: "video",
    platformAngle: document.platformAngle,
    scheduledFor: document.scheduledFor,
    scenePrompt: document.scenePrompt,
    status: document.status,
    summary: document.summary,
    title: document.title,
    updatedAt: document.updatedAt.toISOString(),
  };
}

export async function getLatestFanletterVlogPlansForMember(email: string) {
  const memberEmail = normalizeEmail(email);

  if (!memberEmail) {
    throw new Error("email is required.");
  }

  const collection = await getFanletterVlogPlansCollection();
  const latest = await collection.findOne(
    { memberEmail },
    { sort: { generatedAt: -1, dayIndex: 1 } },
  );

  if (!latest) {
    return [];
  }

  const plans = await collection
    .find({
      generationId: latest.generationId,
      memberEmail,
    })
    .sort({ dayIndex: 1 })
    .limit(PLAN_QUERY_LIMIT)
    .toArray();

  return plans.map(serializeFanletterVlogPlan);
}

export async function saveFanletterVlogPlansForMember({
  email,
  plans,
}: {
  email: string;
  plans: FanletterVlogPlanItem[];
}) {
  const memberEmail = normalizeEmail(email);

  if (!memberEmail) {
    throw new Error("email is required.");
  }

  const collection = await getFanletterVlogPlansCollection();
  const generatedAt = new Date();
  const generationId = `fanletter-plan-run-${randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const documents: FanletterVlogPlanDocument[] = plans.map((plan, index) => {
    const now = new Date();

    return {
      captionHook: plan.captionHook,
      checklist: plan.checklist,
      contentId: null,
      createdAt: now,
      dayIndex: index,
      dayLabel: plan.dayLabel,
      distributedAt: null,
      generatedAt,
      generationId,
      mediaMode: "video",
      memberEmail,
      platformAngle: plan.platformAngle,
      planId: plan.id,
      scheduledFor: toDateKey(addDays(generatedAt, index)),
      scenePrompt: plan.scenePrompt,
      status: "planned",
      summary: plan.summary,
      title: plan.title,
      updatedAt: now,
    };
  });

  if (documents.length === 0) {
    return [];
  }

  await collection.insertMany(documents, { ordered: false });

  return documents.map(serializeFanletterVlogPlan);
}

export async function updateFanletterVlogPlanForMember({
  contentId,
  email,
  planId,
  status,
}: {
  contentId?: string | null;
  email: string;
  planId: string;
  status: FanletterVlogPlanStatus;
}) {
  const memberEmail = normalizeEmail(email);
  const normalizedPlanId = planId.trim();

  if (!memberEmail) {
    throw new Error("email is required.");
  }

  if (!normalizedPlanId) {
    throw new Error("planId is required.");
  }

  const collection = await getFanletterVlogPlansCollection();
  const now = new Date();
  const $set: Partial<FanletterVlogPlanDocument> = {
    status,
    updatedAt: now,
  };

  if (contentId?.trim()) {
    $set.contentId = contentId.trim();
  }

  if (status === "distributed") {
    $set.distributedAt = now;
  }

  const result = await collection.findOneAndUpdate(
    {
      memberEmail,
      planId: normalizedPlanId,
    },
    { $set },
    { returnDocument: "after" },
  );

  if (!result) {
    throw new Error("FanLetter vlog plan not found.");
  }

  return serializeFanletterVlogPlan(result);
}
