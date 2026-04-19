import { serializeMember } from "@/lib/member";
import { validateMemberWalletOwner } from "@/lib/member-owner";
import { getPointsSummaryForMember } from "@/lib/points-service";
import type { PointsSummaryResponse } from "@/lib/points";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawEmail = url.searchParams.get("email");
  const rawWalletAddress = url.searchParams.get("walletAddress");

  if (!rawEmail) {
    return jsonError("email query parameter is required.", 400);
  }

  if (!rawWalletAddress) {
    return jsonError("walletAddress query parameter is required.", 400);
  }

  try {
    const authorization = await validateMemberWalletOwner({
      email: rawEmail,
      walletAddress: rawWalletAddress,
    });

    if (authorization.error) {
      return authorization.error;
    }

    const member = authorization.member;

    const response: PointsSummaryResponse = {
      member: serializeMember(member),
      summary: await getPointsSummaryForMember(member),
    };

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to read points summary.";

    return jsonError(message, 500);
  }
}
