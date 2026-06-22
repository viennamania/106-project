import { normalizeEmail } from "@/lib/member";
import { validateMemberWalletOwner } from "@/lib/member-owner";
import {
  getStarFeedPublishOptIn,
  getStarOptIn,
  getStarRoyaltyTotal,
  setStarFeedPublishOptIn,
  setStarOptIn,
} from "@/lib/seller-stars";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

type OptInRequest = {
  email?: string | null;
  walletAddress?: string | null;
  optIn?: boolean | null;
  allowFeedPublish?: boolean | null;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const authorization = await validateMemberWalletOwner({
    email: url.searchParams.get("email"),
    walletAddress: url.searchParams.get("walletAddress"),
  });

  if (authorization.error) {
    return authorization.error;
  }

  const referralCode = authorization.member?.referralCode;

  if (!referralCode) {
    return jsonError("Completed member required.", 403);
  }

  return Response.json({
    allowFeedPublish: await getStarFeedPublishOptIn(referralCode),
    optIn: await getStarOptIn(referralCode),
    royaltyTotal: await getStarRoyaltyTotal(referralCode),
  });
}

export async function POST(request: Request) {
  let body: OptInRequest | null = null;

  try {
    body = (await request.json()) as OptInRequest;
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

  const referralCode = authorization.member?.referralCode;

  if (!referralCode) {
    return jsonError("Completed member required.", 403);
  }

  // Toggle only the fields present so the two consents are independent.
  if (typeof body?.optIn === "boolean") {
    await setStarOptIn(referralCode, body.optIn);
  }
  if (typeof body?.allowFeedPublish === "boolean") {
    await setStarFeedPublishOptIn(referralCode, body.allowFeedPublish);
  }

  return Response.json({
    allowFeedPublish: await getStarFeedPublishOptIn(referralCode),
    optIn: await getStarOptIn(referralCode),
  });
}
