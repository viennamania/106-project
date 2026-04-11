import {
  WALLET_HISTORY_DEFAULT_LIMIT,
  type WalletTransferHistoryResponse,
} from "@/lib/wallet";
import { getWalletTransferHistory } from "@/lib/wallet-service";
import { normalizeAddress } from "@/lib/thirdweb-webhooks";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawWalletAddress = url.searchParams.get("walletAddress");
  const rawLimit = url.searchParams.get("limit");

  if (!rawWalletAddress) {
    return jsonError("walletAddress query parameter is required.", 400);
  }

  const limit = rawLimit ? Number.parseInt(rawLimit, 10) : WALLET_HISTORY_DEFAULT_LIMIT;

  if (!Number.isFinite(limit) || limit < 1) {
    return jsonError("limit must be a positive integer.", 400);
  }

  try {
    const walletAddress = normalizeAddress(rawWalletAddress);
    const response: WalletTransferHistoryResponse = {
      transfers: await getWalletTransferHistory({
        limit,
        walletAddress,
      }),
      walletAddress,
    };

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to read wallet history.";
    const status = message.toLowerCase().includes("timed out") ? 504 : 500;

    return jsonError(message, status);
  }
}
