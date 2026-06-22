import { randomUUID } from "crypto";

import { LOOKBOOK_VIDEO_CREDITS } from "@/lib/star-lookbook-pricing";
import { generateStarLookbookVideo } from "@/lib/star-lookbook-video";
import {
  authorizeSellerWorkspace,
  chargeSellerCredits,
  getSellerWorkspacePublic,
  INSUFFICIENT_SELLER_CREDITS_ERROR,
  refundSellerCredits,
} from "@/lib/seller-workspace";

export const runtime = "nodejs";
export const maxDuration = 300;

const BLOB_HOST = "t0gqytzvlsa2lapo.public.blob.vercel-storage.com";

type VideoRequest = {
  workspaceId?: string | null;
  workspaceKey?: string | null;
  imageUrl?: string | null;
  sceneBrief?: string | null;
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function isLookbookBlobUrl(value: string) {
  try {
    return new URL(value).hostname === BLOB_HOST;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!process.env.FAL_KEY?.trim()) {
    return jsonError("FAL_KEY is not configured.", 500);
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    return jsonError("BLOB_READ_WRITE_TOKEN is not configured.", 500);
  }

  let body: VideoRequest | null = null;

  try {
    body = (await request.json()) as VideoRequest;
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

  const imageUrl = body?.imageUrl?.trim() ?? "";

  // Only a generated lookbook image (on our blob) can be animated.
  if (!imageUrl || !isLookbookBlobUrl(imageUrl)) {
    return jsonError("A generated lookbook image is required.", 400);
  }

  const cost = LOOKBOOK_VIDEO_CREDITS;
  const sourceId = randomUUID();

  try {
    await chargeSellerCredits({
      amount: cost,
      memo: "lookbook video",
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

  try {
    const video = await generateStarLookbookVideo({
      imageUrl,
      referralCode: workspace.workspaceId,
      sceneBrief: body?.sceneBrief ?? null,
    });

    const updated = await getSellerWorkspacePublic(workspace.workspaceId);

    return Response.json({
      creditBalance: updated?.creditBalance ?? null,
      video,
    });
  } catch (error) {
    await refundSellerCredits({
      amount: cost,
      sourceId,
      workspaceId: workspace.workspaceId,
    });

    return jsonError(
      error instanceof Error ? error.message : "Failed to generate the video.",
      500,
    );
  }
}
