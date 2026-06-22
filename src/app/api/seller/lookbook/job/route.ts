import {
  enqueueSellerJob,
  getSellerJob,
  INSUFFICIENT_SELLER_CREDITS_ERROR,
  type SellerJobType,
} from "@/lib/seller-jobs";
import {
  clampLookbookImageCount,
  LOOKBOOK_VIDEO_CREDITS,
} from "@/lib/star-lookbook-pricing";
import {
  authorizeSellerWorkspace,
  getSellerWorkspacePublic,
} from "@/lib/seller-workspace";

export const runtime = "nodejs";

const BLOB_HOST = "t0gqytzvlsa2lapo.public.blob.vercel-storage.com";

type JobRequest = {
  workspaceId?: string | null;
  workspaceKey?: string | null;
  type?: string | null;
  starId?: string | null;
  starImageIndex?: number | null;
  garmentImageUrls?: unknown;
  sceneBrief?: string | null;
  aspectRatio?: string | null;
  numImages?: number | null;
  imageUrl?: string | null;
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function isBlobUrl(value: string) {
  try {
    return new URL(value).hostname === BLOB_HOST;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const workspace = await authorizeSellerWorkspace({
    workspaceId: url.searchParams.get("workspaceId"),
    workspaceKey: url.searchParams.get("workspaceKey"),
  });

  if (!workspace) {
    return jsonError("Workspace not found or unauthorized.", 401);
  }

  const jobId = url.searchParams.get("jobId");

  if (!jobId) {
    return jsonError("jobId is required.", 400);
  }

  const job = await getSellerJob(jobId, workspace.workspaceId);

  if (!job) {
    return jsonError("Job not found.", 404);
  }

  return Response.json({ job });
}

export async function POST(request: Request) {
  let body: JobRequest | null = null;

  try {
    body = (await request.json()) as JobRequest;
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

  const type: SellerJobType = body?.type === "video" ? "video" : "image";
  let cost: number;
  let input;

  if (type === "video") {
    const imageUrl = body?.imageUrl?.trim() ?? "";
    if (!imageUrl || !isBlobUrl(imageUrl)) {
      return jsonError("A generated lookbook image is required.", 400);
    }
    cost = LOOKBOOK_VIDEO_CREDITS;
    input = { imageUrl, sceneBrief: body?.sceneBrief ?? null };
  } else {
    const starId = body?.starId?.trim() ?? "";
    const garmentImageUrls = toStringArray(body?.garmentImageUrls)
      .map((u) => u.trim())
      .filter(Boolean);

    if (!starId) {
      return jsonError("AI 스타를 선택하세요.", 400);
    }
    if (garmentImageUrls.length === 0) {
      return jsonError("At least one garment image is required.", 400);
    }

    const numImages = clampLookbookImageCount(
      typeof body?.numImages === "number" ? body.numImages : undefined,
    );
    cost = numImages;
    input = {
      aspectRatio: body?.aspectRatio ?? null,
      garmentImageUrls,
      numImages,
      sceneBrief: body?.sceneBrief ?? null,
      starId,
      starImageIndex:
        typeof body?.starImageIndex === "number" ? body.starImageIndex : 0,
    };
  }

  try {
    const job = await enqueueSellerJob({
      cost,
      input,
      type,
      workspaceId: workspace.workspaceId,
    });
    const updated = await getSellerWorkspacePublic(workspace.workspaceId);

    return Response.json(
      { creditBalance: updated?.creditBalance ?? null, job },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === INSUFFICIENT_SELLER_CREDITS_ERROR
    ) {
      return jsonError("크레딧이 부족합니다. 크레딧을 충전해 주세요.", 402);
    }

    return jsonError(
      error instanceof Error ? error.message : "Failed to enqueue job.",
      500,
    );
  }
}
