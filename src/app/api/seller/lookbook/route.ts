import { randomUUID } from "crypto";

import {
  authorizeSellerWorkspace,
  chargeSellerCredits,
  getSellerWorkspacePublic,
  INSUFFICIENT_SELLER_CREDITS_ERROR,
  recordSellerLookbookGeneration,
  refundSellerCredits,
} from "@/lib/seller-workspace";
import { awardStarModelRoyalty, resolveSellerStarImage } from "@/lib/seller-stars";
import { clampLookbookImageCount } from "@/lib/star-lookbook-pricing";
import {
  generateStarLookbook,
  type StarLookbookAspectRatio,
} from "@/lib/star-lookbook-service";

export const runtime = "nodejs";
export const maxDuration = 240;

const ASPECT_RATIOS: StarLookbookAspectRatio[] = [
  "auto",
  "1:1",
  "3:4",
  "4:5",
  "2:3",
  "9:16",
];

type SellerLookbookRequest = {
  workspaceId?: string | null;
  workspaceKey?: string | null;
  starId?: string | null;
  starImageIndex?: number | null;
  garmentImageUrls?: unknown;
  sceneBrief?: string | null;
  modelName?: string | null;
  aspectRatio?: string | null;
  numImages?: number | null;
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function parseAspect(value: string | null | undefined) {
  const normalized = value?.trim();
  return ASPECT_RATIOS.includes(normalized as StarLookbookAspectRatio)
    ? (normalized as StarLookbookAspectRatio)
    : undefined;
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return jsonError("OPENAI_API_KEY is not configured.", 500);
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    return jsonError("BLOB_READ_WRITE_TOKEN is not configured.", 500);
  }

  let body: SellerLookbookRequest | null = null;

  try {
    body = (await request.json()) as SellerLookbookRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const workspace = await authorizeSellerWorkspace({
    workspaceId: body?.workspaceId,
    workspaceKey: body?.workspaceKey,
  });

  if (!workspace) {
    return jsonError("Workspace not found or unauthorized.", 401);
  }

  // The model is ALWAYS an AI star — resolve the image server-side from starId
  // so an arbitrary model image can never be used.
  const modelImageUrl = await resolveSellerStarImage(
    body?.starId,
    typeof body?.starImageIndex === "number" ? body.starImageIndex : 0,
  );

  if (!modelImageUrl) {
    return jsonError("AI 스타를 선택하세요.", 400);
  }

  const garmentImageUrls = toStringArray(body?.garmentImageUrls)
    .map((url) => url.trim())
    .filter(Boolean);

  if (garmentImageUrls.length === 0) {
    return jsonError("At least one garment image URL is required.", 400);
  }

  const numImages = clampLookbookImageCount(
    typeof body?.numImages === "number" ? body.numImages : undefined,
  );
  const cost = numImages; // 1 credit per shot
  const sourceId = randomUUID();

  // 1) Charge credits up front.
  try {
    await chargeSellerCredits({
      amount: cost,
      memo: "lookbook",
      sourceId,
      workspaceId: workspace.workspaceId,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === INSUFFICIENT_SELLER_CREDITS_ERROR
    ) {
      return jsonError("크레딧이 부족합니다. 크레딧을 충전해 주세요.", 402);
    }

    return jsonError(
      error instanceof Error ? error.message : "Failed to charge credits.",
      500,
    );
  }

  // 2) Generate; refund on failure.
  try {
    const images = await generateStarLookbook({
      aspectRatio: parseAspect(body?.aspectRatio),
      garmentImageUrls,
      memberEmail: workspace.email || workspace.workspaceId,
      numImages,
      referralCode: workspace.workspaceId,
      sceneBrief: body?.sceneBrief ?? null,
      starAvatarUrl: modelImageUrl,
      starName: body?.modelName ?? null,
    });

    const usedStarId = body?.starId?.trim() ?? "";

    await recordSellerLookbookGeneration({
      imageUrls: images.map((image) => image.url),
      starId: usedStarId,
      workspaceId: workspace.workspaceId,
    });

    // Credit the AI star's owner with model royalty points.
    await awardStarModelRoyalty({
      shots: numImages,
      sourceId,
      starId: usedStarId,
    });

    const updated = await getSellerWorkspacePublic(workspace.workspaceId);

    return Response.json({
      creditBalance: updated?.creditBalance ?? null,
      images,
    });
  } catch (error) {
    await refundSellerCredits({
      amount: cost,
      sourceId,
      workspaceId: workspace.workspaceId,
    });

    return jsonError(
      error instanceof Error
        ? error.message
        : "Failed to generate the lookbook.",
      500,
    );
  }
}
