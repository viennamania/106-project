import { searchWalletRecipients } from "@/lib/wallet-service";
import type { WalletRecipientSearchResponse } from "@/lib/wallet";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("query");
  const excludeEmail = url.searchParams.get("excludeEmail");

  if (!query) {
    return jsonError("query parameter is required.", 400);
  }

  try {
    const response: WalletRecipientSearchResponse = {
      results: await searchWalletRecipients({
        excludeEmail,
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
