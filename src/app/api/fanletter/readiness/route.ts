import { getFanletterReadinessForMember } from "@/lib/fanletter-readiness-service";
import { validateMemberWalletOwner } from "@/lib/member-owner";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawEmail = url.searchParams.get("email");
  const rawWalletAddress = url.searchParams.get("walletAddress");

  try {
    const authorization = await validateMemberWalletOwner({
      email: rawEmail,
      walletAddress: rawWalletAddress,
    });

    if (authorization.error) {
      return authorization.error;
    }

    return Response.json(
      await getFanletterReadinessForMember(authorization.member),
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load FanLetter readiness.";

    return jsonError(message, 500);
  }
}
