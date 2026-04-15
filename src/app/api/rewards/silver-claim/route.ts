import { getMembersCollection } from "@/lib/mongodb";
import { normalizeEmail } from "@/lib/member";
import type {
  SilverRewardClaimRequest,
  SilverRewardClaimResponse,
  SilverRewardClaimSummaryResponse,
} from "@/lib/silver-reward-claim";
import {
  getSilverRewardClaimSummary,
  submitSilverRewardClaim,
} from "@/lib/silver-reward-claim-service";

export const runtime = "nodejs";
export const maxDuration = 30;

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function getErrorStatus(message: string) {
  if (
    message === "Silver reward has already been claimed." ||
    message === "Silver reward claim is already in progress."
  ) {
    return 409;
  }

  if (
    message === "Member signup is not complete." ||
    message === "Silver member card redemption is not complete." ||
    message ===
      "Member does not have a valid wallet address for the silver reward claim."
  ) {
    return 400;
  }

  if (
    message.includes("not configured") ||
    message.includes("required") ||
    message.includes("does not match")
  ) {
    return 503;
  }

  return 500;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawEmail = url.searchParams.get("email");

  if (!rawEmail) {
    return jsonError("email query parameter is required.", 400);
  }

  try {
    const collection = await getMembersCollection();
    const member = await collection.findOne({ email: normalizeEmail(rawEmail) });

    if (!member) {
      return jsonError("Member not found.", 404);
    }

    const response: SilverRewardClaimSummaryResponse =
      await getSilverRewardClaimSummary(member);

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load the silver reward claim.";

    return jsonError(message, getErrorStatus(message));
  }
}

export async function POST(request: Request) {
  let body: SilverRewardClaimRequest | null = null;

  try {
    body = (await request.json()) as SilverRewardClaimRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const rawEmail = body?.email;

  if (!rawEmail) {
    return jsonError("email is required.", 400);
  }

  try {
    const collection = await getMembersCollection();
    const member = await collection.findOne({ email: normalizeEmail(rawEmail) });

    if (!member) {
      return jsonError("Member not found.", 404);
    }

    const response: SilverRewardClaimResponse = await submitSilverRewardClaim(
      member,
    );

    return Response.json(response, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to submit the silver reward claim.";

    return jsonError(message, getErrorStatus(message));
  }
}
