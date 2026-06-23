import { getMemberLookbookGenerations } from "@/lib/member-lookbook-history";
import { validateMemberWalletOwner } from "@/lib/member-owner";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get("email");
  const walletAddress = url.searchParams.get("walletAddress");

  const authorization = await validateMemberWalletOwner({ email, walletAddress });

  if (authorization.error) {
    return authorization.error;
  }

  try {
    const generations = await getMemberLookbookGenerations(
      authorization.member.email,
    );

    return Response.json({ generations });
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Failed to read the lookbook history.",
      500,
    );
  }
}
