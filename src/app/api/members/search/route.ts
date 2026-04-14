import { searchWalletRecipients } from "@/lib/wallet-service";
import type { WalletRecipientSearchResponse } from "@/lib/wallet";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const memberEmail = url.searchParams.get("memberEmail");
  const query = url.searchParams.get("query");

  if (!memberEmail) {
    return jsonError("memberEmail query parameter is required.", 400);
  }

  if (!query) {
    return jsonError("query parameter is required.", 400);
  }

  try {
    const response: WalletRecipientSearchResponse = {
      results: await searchWalletRecipients({
        memberEmail,
        query,
      }),
    };

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to search members.";

    return jsonError(message, 500);
  }
}
