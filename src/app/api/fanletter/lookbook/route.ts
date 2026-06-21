import { randomUUID } from "crypto";

import { normalizeEmail } from "@/lib/member";
import { validateMemberWalletOwner } from "@/lib/member-owner";
import {
  chargeLookbookPoints,
  INSUFFICIENT_POINTS_ERROR,
  refundLookbookPoints,
} from "@/lib/star-lookbook-billing";
import { clampLookbookImageCount } from "@/lib/star-lookbook-pricing";
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
  if (!process.env.FAL_KEY?.trim()) {
    return jsonError("FAL_KEY is not configured.", 500);
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

  const starAvatarUrl = body?.starAvatarUrl?.trim() ?? "";

  if (!starAvatarUrl) {
    return jsonError("starAvatarUrl is required.", 400);
  }

  const garmentImageUrls = toStringArray(body?.garmentImageUrls)
    .map((url) => url.trim())
    .filter(Boolean);

  if (garmentImageUrls.length === 0) {
    return jsonError("At least one garment image URL is required.", 400);
  }

  const authorization = await validateMemberWalletOwner({ email, walletAddress });

  if (authorization.error) {
    return authorization.error;
  }

  const member = authorization.member;

  if (!member?.referralCode) {
    return jsonError(
      "The lookbook studio is only available to completed members.",
      403,
    );
  }

  const numImages = clampLookbookImageCount(
    typeof body?.numImages === "number" ? body.numImages : undefined,
  );
  const sourceId = randomUUID();

  // 1) Charge points up front (atomic guard-decrement).
  let chargedPoints: number;
  let summary: Awaited<ReturnType<typeof chargeLookbookPoints>>["summary"];

  try {
    const charge = await chargeLookbookPoints({
      memberEmail: member.email,
      numImages,
      sourceId,
    });
    chargedPoints = charge.chargedPoints;
    summary = charge.summary;
  } catch (error) {
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
      referralCode: member.referralCode,
      resolution: parseEnum(body?.resolution, RESOLUTIONS),
      sceneBrief: body?.sceneBrief ?? null,
      starAvatarUrl,
      starName: body?.starName ?? null,
    });

    return Response.json({ chargedPoints, images, summary });
  } catch (error) {
    await refundLookbookPoints({
      chargedPoints,
      memberEmail: member.email,
      sourceId,
    });

    return jsonError(
      error instanceof Error
        ? error.message
        : "Failed to generate the star lookbook.",
      500,
    );
  }
}
