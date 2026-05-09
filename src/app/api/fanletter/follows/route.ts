import type {
  FanletterCharacterFollowStateResponse,
  FanletterCharacterFollowUpdateRequest,
} from "@/lib/content";
import {
  getFanletterFollowState,
  updateFanletterFollowForMember,
} from "@/lib/fanletter-follow-service";
import { validateMemberWalletOwner } from "@/lib/member-owner";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function getErrorStatus(message: string) {
  if (
    message === "creatorReferralCode is required." ||
    message === "followerEmail is required." ||
    message === "Unsupported follow action."
  ) {
    return 400;
  }

  if (message === "Creator not found.") {
    return 404;
  }

  return 500;
}

function readFollowAction(
  value: FanletterCharacterFollowUpdateRequest["action"],
) {
  if (!value || value === "follow" || value === "unfollow") {
    return value ?? "follow";
  }

  throw new Error("Unsupported follow action.");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const creatorReferralCode = url.searchParams.get("creatorReferralCode");
  const rawEmail = url.searchParams.get("email");
  const rawWalletAddress = url.searchParams.get("walletAddress");

  try {
    let followerEmail: string | null = null;

    if (rawEmail && rawWalletAddress) {
      const authorization = await validateMemberWalletOwner({
        email: rawEmail,
        walletAddress: rawWalletAddress,
      });

      if (!authorization.error) {
        followerEmail = authorization.normalizedEmail;
      }
    }

    const response: FanletterCharacterFollowStateResponse =
      await getFanletterFollowState({
        creatorReferralCode,
        followerEmail,
      });

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load follow state.";

    return jsonError(message, getErrorStatus(message));
  }
}

export async function POST(request: Request) {
  let body: FanletterCharacterFollowUpdateRequest | null = null;

  try {
    body = (await request.json()) as FanletterCharacterFollowUpdateRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  try {
    const authorization = await validateMemberWalletOwner({
      email: body?.email,
      walletAddress: body?.walletAddress,
    });

    if (authorization.error) {
      return authorization.error;
    }

    const response: FanletterCharacterFollowStateResponse =
      await updateFanletterFollowForMember({
        action: readFollowAction(body?.action),
        creatorReferralCode: body?.creatorReferralCode,
        followerEmail: authorization.normalizedEmail,
      });

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update follow state.";

    return jsonError(message, getErrorStatus(message));
  }
}
