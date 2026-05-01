import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

import {
  CONTENT_VIDEO_MAX_BYTES,
  contentVideoMimeTypes,
} from "@/lib/content";
import { normalizeEmail } from "@/lib/member";
import { validateMemberWalletOwner } from "@/lib/member-owner";

export const runtime = "nodejs";

const allowedVideoTypes = new Set<string>(contentVideoMimeTypes);

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function parseClientPayload(clientPayload: string | null) {
  if (!clientPayload) {
    return null;
  }

  try {
    const parsed = JSON.parse(clientPayload) as {
      email?: unknown;
      walletAddress?: unknown;
    };
    const email = normalizeEmail(
      typeof parsed.email === "string" ? parsed.email : "",
    );
    const walletAddress =
      typeof parsed.walletAddress === "string"
        ? parsed.walletAddress.trim()
        : "";

    if (!email || !walletAddress) {
      return null;
    }

    return { email, walletAddress };
  } catch {
    return null;
  }
}

function hasAllowedVideoExtension(pathname: string) {
  const normalized = pathname.toLowerCase();

  return (
    normalized.endsWith(".mp4") ||
    normalized.endsWith(".mov") ||
    normalized.endsWith(".webm")
  );
}

export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    return jsonError("BLOB_READ_WRITE_TOKEN is not configured.", 500);
  }

  let body: HandleUploadBody;

  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  try {
    const response = await handleUpload({
      body,
      request,
      async onBeforeGenerateToken(pathname, clientPayload) {
        const payload = parseClientPayload(clientPayload);

        if (!payload) {
          throw new Error("email and walletAddress are required.");
        }

        const authorization = await validateMemberWalletOwner({
          email: payload.email,
          walletAddress: payload.walletAddress,
        });

        if (authorization.error) {
          throw new Error("Wallet owner validation failed.");
        }

        const referralCode = authorization.member.referralCode;

        if (!referralCode) {
          throw new Error("Completed member is missing referral code.");
        }

        const allowedPrefix = `content-posts/${referralCode}/videos/`;

        if (
          !pathname.startsWith(allowedPrefix) ||
          pathname.includes("..") ||
          !hasAllowedVideoExtension(pathname)
        ) {
          throw new Error("Invalid video upload path.");
        }

        return {
          addRandomSuffix: true,
          allowedContentTypes: [...allowedVideoTypes],
          cacheControlMaxAge: 60 * 60 * 24 * 365,
          maximumSizeInBytes: CONTENT_VIDEO_MAX_BYTES,
          tokenPayload: JSON.stringify({
            email: payload.email,
            walletAddress: payload.walletAddress,
          }),
        };
      },
    });

    return Response.json(response);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to upload video.",
      400,
    );
  }
}
