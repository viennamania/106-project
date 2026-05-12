import {
  type ContentPriceType,
  type CreatorProfileAvatarCandidate,
  type FanletterFanRequestType,
  creatorAvatarExpressions,
} from "@/lib/content";
import { readFirstSearchParam } from "@/lib/fanletter-routing";

export type FanletterCreateInitialPlan = {
  avatarReferenceExpression?: CreatorProfileAvatarCandidate["expression"];
  avatarReferenceMode?: "set" | "single";
  body?: string;
  fanOnlyIntent?: boolean;
  fanRequestBody?: string;
  fanRequestCharacterName?: string;
  fanRequestId?: string;
  fanRequestType?: FanletterFanRequestType;
  mode?: "video";
  planId?: string;
  priceType?: ContentPriceType;
  prompt?: string;
  summary?: string;
  title?: string;
};

export type FanletterCreateSearchParams = {
  fanRequestBody?: string | string[];
  fanRequestCharacterName?: string | string[];
  fanRequestId?: string | string[];
  fanRequestType?: string | string[];
  planAudience?: string | string[];
  planAvatarExpression?: string | string[];
  planAvatarMode?: string | string[];
  planBody?: string | string[];
  planId?: string | string[];
  planMode?: string | string[];
  planPriceType?: string | string[];
  planPrompt?: string | string[];
  planSummary?: string | string[];
  planTitle?: string | string[];
  ref?: string | string[];
  returnTo?: string | string[];
};

function readPlanText(rawValue: string | string[] | undefined, limit: number) {
  return readFirstSearchParam(rawValue)?.trim().slice(0, limit) || undefined;
}

export function readFanletterCreateInitialPlan(
  query: FanletterCreateSearchParams,
): FanletterCreateInitialPlan | undefined {
  const title = readPlanText(query.planTitle, 88);
  const summary = readPlanText(query.planSummary, 180);
  const prompt = readPlanText(query.planPrompt, 1_200);
  const body = readPlanText(query.planBody, 600);
  const fanRequestBody = readPlanText(query.fanRequestBody, 600);
  const fanRequestCharacterName = readPlanText(
    query.fanRequestCharacterName,
    80,
  );
  const fanRequestId = readPlanText(query.fanRequestId, 120);
  const rawFanRequestType = readPlanText(query.fanRequestType, 32);
  const fanRequestType =
    rawFanRequestType === "message" || rawFanRequestType === "vlog_request"
      ? rawFanRequestType
      : undefined;
  const rawPriceType = readPlanText(query.planPriceType, 32);
  const priceType =
    rawPriceType === "paid" || rawPriceType === "free" ? rawPriceType : undefined;
  const fanOnlyIntent =
    readPlanText(query.planAudience, 32)?.toLowerCase() === "fan-only";
  const rawAvatarExpression = readPlanText(query.planAvatarExpression, 32);
  const avatarReferenceExpression = creatorAvatarExpressions.find(
    (expression) => expression === rawAvatarExpression,
  );
  const rawAvatarReferenceMode = readPlanText(query.planAvatarMode, 32);
  const avatarReferenceMode =
    rawAvatarReferenceMode === "set" || rawAvatarReferenceMode === "single"
      ? rawAvatarReferenceMode
      : undefined;
  const planId = readPlanText(query.planId, 120);

  if (
    !title &&
    !summary &&
    !prompt &&
    !body &&
    !fanRequestBody &&
    !fanRequestCharacterName &&
    !planId &&
    !fanRequestId &&
    !fanRequestType &&
    !priceType &&
    !fanOnlyIntent &&
    !avatarReferenceExpression &&
    !avatarReferenceMode
  ) {
    return undefined;
  }

  return {
    avatarReferenceExpression,
    avatarReferenceMode,
    body,
    fanOnlyIntent,
    fanRequestBody,
    fanRequestCharacterName,
    fanRequestId,
    fanRequestType,
    mode: "video",
    planId,
    priceType,
    prompt,
    summary,
    title,
  };
}
