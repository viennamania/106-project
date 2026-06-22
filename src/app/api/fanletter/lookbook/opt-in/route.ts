import { normalizeEmail } from "@/lib/member";
import { validateMemberWalletOwner } from "@/lib/member-owner";
import { getStarOptIn, setStarOptIn } from "@/lib/seller-stars";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

type OptInRequest = {
  email?: string | null;
  walletAddress?: string | null;
  optIn?: boolean | null;
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

  return Response.json({ optIn: await getStarOptIn(referralCode) });
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

  const optIn = Boolean(body?.optIn);
  await setStarOptIn(referralCode, optIn);

  return Response.json({ optIn });
}
