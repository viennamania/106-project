import { createHash, randomUUID } from "crypto";

import { normalizeEmail } from "@/lib/member";
import { recordMemberLookbookGeneration } from "@/lib/member-lookbook-history";
import {
  consumeFreeTrialShots,
  refundFreeTrialShots,
} from "@/lib/member-lookbook-trial";
import { validateMemberWalletOwner } from "@/lib/member-owner";
import { syncPointLedgerForMemberEmail } from "@/lib/points-service";
import {
  awardStarModelRoyalty,
  getStarOwnerEmail,
  resolveSellerStarImage,
} from "@/lib/seller-stars";
import {
  chargeLookbookPoints,
  INSUFFICIENT_POINTS_ERROR,
  refundLookbookPoints,
} from "@/lib/star-lookbook-billing";
import {
  clampLookbookImageCount,
  isLookbookBlobUrl,
} from "@/lib/star-lookbook-pricing";
import {
  generateStarLookbook,
  type StarLookbookAspectRatio,
  type StarLookbookResolution,
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
const RESOLUTIONS: StarLookbookResolution[] = ["1K", "2K", "4K"];

type LookbookRequest = {
  email?: string | null;
  walletAddress?: string | null;
  starAvatarUrl?: string | null;
  // Optional public AI star (opt-out catalog). When set, the model image is
  // resolved server-side from the star and its owner earns royalty points.
  starId?: string | null;
  starImageIndex?: number | null;
  garmentImageUrls?: unknown;
  sceneBrief?: string | null;
  starName?: string | null;
  aspectRatio?: string | null;
  resolution?: string | null;
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

function parseEnum<T extends string>(
  value: string | null | undefined,
  allowed: T[],
): T | undefined {
  const normalized = value?.trim();

  return allowed.includes(normalized as T) ? (normalized as T) : undefined;
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return jsonError("OPENAI_API_KEY is not configured.", 500);
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    return jsonError("BLOB_READ_WRITE_TOKEN is not configured.", 500);
  }

  let body: LookbookRequest | null = null;

  try {
    body = (await request.json()) as LookbookRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const email = normalizeEmail(body?.email ?? "");
  const walletAddress = body?.walletAddress?.trim() ?? "";

  if (!email) {
    return jsonError("email is required.", 400);
  }

  if (!walletAddress) {
    return jsonError("walletAddress is required.", 400);
  }

  // The model is either a public AI star (resolved server-side from starId) or
  // the member's own uploaded star avatar.
  const starId = body?.starId?.trim() ?? "";
  let starAvatarUrl: string;

  if (starId) {
    const resolved = await resolveSellerStarImage(
      starId,
      typeof body?.starImageIndex === "number" ? body.starImageIndex : 0,
    );
    if (!resolved) {
      return jsonError("선택한 AI 스타를 사용할 수 없습니다.", 400);
    }
    starAvatarUrl = resolved;
  } else {
    starAvatarUrl = body?.starAvatarUrl?.trim() ?? "";
    if (!starAvatarUrl) {
      return jsonError("starAvatarUrl is required.", 400);
    }
    // Fetched server-side, so restrict to our own Blob store (prevents SSRF).
    if (!isLookbookBlobUrl(starAvatarUrl)) {
      return jsonError("starAvatarUrl must be an uploaded image.", 400);
    }
  }

  const garmentImageUrls = toStringArray(body?.garmentImageUrls)
    .map((url) => url.trim())
    .filter(Boolean);

  if (garmentImageUrls.length === 0) {
    return jsonError("At least one garment image URL is required.", 400);
  }

  if (!garmentImageUrls.every(isLookbookBlobUrl)) {
    return jsonError("Garment images must be uploaded images.", 400);
  }

  const authorization = await validateMemberWalletOwner({
    email,
    walletAddress,
    // Lite (pending_payment) members can use the studio's free trial without a
    // USDT membership. Paid shots still require points, so once the free trial
    // is used up the charge fails (402) and the UI nudges them to join.
    allowedStatuses: ["completed", "pending_payment"],
  });

  if (authorization.error) {
    return authorization.error;
  }

  const member = authorization.member;

  if (!member) {
    return jsonError("Member not found.", 404);
  }

  // Storage namespace: completed members use their referralCode; lite members
  // (no referralCode yet) get a stable derived key from their email.
  const lookbookNamespace =
    member.referralCode ??
    `lite-${createHash("sha256")
      .update(member.email)
      .digest("hex")
      .slice(0, 16)}`;

  const numImages = clampLookbookImageCount(
    typeof body?.numImages === "number" ? body.numImages : undefined,
  );
  const sourceId = randomUUID();

  // Free trial: the first N shots per member are free — waives the point charge
  // (without injecting spendable points). Only the remaining shots are charged.
  const freeShots = await consumeFreeTrialShots(member.email, numImages);
  const paidShots = numImages - freeShots;

  // 1) Charge points up front (atomic guard-decrement) for the non-free shots.
  let chargedPoints = 0;
  let summary: Awaited<ReturnType<typeof chargeLookbookPoints>>["summary"];

  try {
    if (paidShots > 0) {
      const charge = await chargeLookbookPoints({
        memberEmail: member.email,
        numImages: paidShots,
        sourceId,
      });
      chargedPoints = charge.chargedPoints;
      summary = charge.summary;
    } else {
      summary = await syncPointLedgerForMemberEmail(member.email);
    }
  } catch (error) {
    // Bailing out — give back the trial shots we just consumed.
    await refundFreeTrialShots(member.email, freeShots);

    if (error instanceof Error && error.message === INSUFFICIENT_POINTS_ERROR) {
      return jsonError("Not enough points to generate this lookbook.", 402);
    }

    return jsonError(
      error instanceof Error ? error.message : "Failed to charge points.",
      500,
    );
  }

  // 2) Generate; refund the charge if generation fails.
  try {
    const images = await generateStarLookbook({
      aspectRatio: parseEnum(body?.aspectRatio, ASPECT_RATIOS),
      garmentImageUrls,
      memberEmail: member.email,
      numImages,
      referralCode: lookbookNamespace,
      resolution: parseEnum(body?.resolution, RESOLUTIONS),
      sceneBrief: body?.sceneBrief ?? null,
      starAvatarUrl,
      starName: body?.starName ?? null,
    });

    // Using someone else's public AI star earns its owner royalty points.
    if (starId) {
      const ownerEmail = await getStarOwnerEmail(starId);
      if (ownerEmail && ownerEmail !== member.email) {
        await awardStarModelRoyalty({ shots: numImages, sourceId, starId });
      }
    }

    // Best-effort history for the studio's "my lookbooks" + CSV export.
    await recordMemberLookbookGeneration({
      garmentImageUrls,
      imageUrls: images.map((image) => image.url),
      memberEmail: member.email,
      starId: starId || null,
      starName: body?.starName ?? null,
    });

    return Response.json({ chargedPoints, images, summary });
  } catch (error) {
    await refundLookbookPoints({
      chargedPoints,
      memberEmail: member.email,
      sourceId,
    });
    await refundFreeTrialShots(member.email, freeShots);

    return jsonError(
      error instanceof Error
        ? error.message
        : "Failed to generate the star lookbook.",
      500,
    );
  }
}
