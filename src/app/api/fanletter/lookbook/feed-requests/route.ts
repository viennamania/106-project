import { updateContentPostForMember } from "@/lib/content-service";
import { normalizeEmail } from "@/lib/member";
import { validateMemberWalletOwner } from "@/lib/member-owner";
import {
  getFeedPublicationForOwner,
  listPendingFeedPublicationsForOwner,
  setFeedPublicationStatus,
} from "@/lib/seller-feed-publications";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

type ModerateRequest = {
  email?: string | null;
  walletAddress?: string | null;
  contentId?: string | null;
  action?: string | null;
};

// The star owner's moderation queue for seller feed-publish requests.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const authorization = await validateMemberWalletOwner({
    email: url.searchParams.get("email"),
    walletAddress: url.searchParams.get("walletAddress"),
  });

  if (authorization.error) {
    return authorization.error;
  }

  const member = authorization.member;
  if (!member?.referralCode || !member.email) {
    return jsonError("Completed member required.", 403);
  }

  return Response.json({
    requests: await listPendingFeedPublicationsForOwner(member.email),
  });
}

export async function POST(request: Request) {
  let body: ModerateRequest | null = null;
  try {
    body = (await request.json()) as ModerateRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const authorization = await validateMemberWalletOwner({
    email: normalizeEmail(body?.email ?? ""),
    walletAddress: body?.walletAddress?.trim() ?? "",
  });

  if (authorization.error) {
    return authorization.error;
  }

  const member = authorization.member;
  if (!member?.referralCode || !member.email) {
    return jsonError("Completed member required.", 403);
  }

  const contentId = body?.contentId?.trim() ?? "";
  const action = body?.action?.trim();

  if (!contentId) {
    return jsonError("contentId is required.", 400);
  }
  if (action !== "approve" && action !== "reject") {
    return jsonError("action must be approve or reject.", 400);
  }

  // Scope to the owner — an owner can only moderate their own star's requests.
  const publication = await getFeedPublicationForOwner(contentId, member.email);
  if (!publication) {
    return jsonError("Request not found.", 404);
  }
  if (publication.status !== "pending") {
    return jsonError("This request was already handled.", 409);
  }

  try {
    await updateContentPostForMember({
      contentId,
      email: member.email,
      status: action === "approve" ? "published" : "archived",
    });
    await setFeedPublicationStatus(
      contentId,
      action === "approve" ? "approved" : "rejected",
    );

    return Response.json({ ok: true, status: action });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "처리에 실패했습니다.",
      500,
    );
  }
}
