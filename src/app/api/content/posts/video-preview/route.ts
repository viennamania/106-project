import {
  type ContentPostVideoPreviewResponse,
} from "@/lib/content";
import { createContentVideoPreview } from "@/lib/content-video-preview-service";
import { normalizeEmail } from "@/lib/member";
import { validateMemberWalletOwner } from "@/lib/member-owner";

export const runtime = "nodejs";
export const maxDuration = 300;

type CreateContentVideoPreviewRequest = {
  email?: string | null;
  sourceVideoUrl?: string | null;
  title?: string | null;
  walletAddress?: string | null;
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function trimToLength(value: string | null | undefined, limit: number) {
  return value?.trim().slice(0, limit) ?? "";
}

export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    return jsonError("BLOB_READ_WRITE_TOKEN is not configured.", 500);
  }

  let body: CreateContentVideoPreviewRequest | null = null;

  try {
    body = (await request.json()) as CreateContentVideoPreviewRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const email = normalizeEmail(body?.email ?? "");
  const walletAddress = body?.walletAddress?.trim() ?? "";
  const sourceVideoUrl = trimToLength(body?.sourceVideoUrl, 800);
  const title = trimToLength(body?.title, 120);

  if (!email) {
    return jsonError("email is required.", 400);
  }

  if (!walletAddress) {
    return jsonError("walletAddress is required.", 400);
  }

  if (!sourceVideoUrl) {
    return jsonError("sourceVideoUrl is required.", 400);
  }

  try {
    const authorization = await validateMemberWalletOwner({
      email,
      walletAddress,
    });

    if (authorization.error) {
      return authorization.error;
    }

    const referralCode = authorization.member.referralCode;

    if (!referralCode) {
      return jsonError("Completed member is missing referral code.", 403);
    }

    const response: ContentPostVideoPreviewResponse =
      await createContentVideoPreview({
        referralCode,
        sourceVideoUrl,
        title,
      });

    return Response.json(response);
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Failed to generate preview video.",
      500,
    );
  }
}
