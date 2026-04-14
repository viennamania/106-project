import { after } from "next/server";
import {
  WALLET_HISTORY_DEFAULT_LIMIT,
  type WalletTransferMutationRequest,
  type WalletTransferHistoryResponse,
} from "@/lib/wallet";
import {
  confirmWalletAppSendTransfer,
  getWalletTransferHistorySnapshot,
  recordWalletAppSendTransfer,
  refreshWalletTransferHistory,
} from "@/lib/wallet-service";
import { normalizeAddress } from "@/lib/thirdweb-webhooks";

export const runtime = "nodejs";

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
    const snapshot = await getWalletTransferHistorySnapshot({
      limit,
      walletAddress,
    });

    if (snapshot.needsSync) {
      after(async () => {
        try {
          await refreshWalletTransferHistory({
            limit,
            walletAddress,
          });
        } catch (error) {
          console.error("Failed to refresh wallet history after response.", error);
        }
      });
    }

    const response: WalletTransferHistoryResponse = {
      syncing: snapshot.needsSync,
      transfers: snapshot.transfers,
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

export async function POST(request: Request) {
  let payload: WalletTransferMutationRequest;

  try {
    payload = (await request.json()) as WalletTransferMutationRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const amountWei = payload.amountWei?.trim();
  const transactionHash = payload.transactionHash?.trim().toLowerCase();

  if (
    !amountWei ||
    !/^\d+$/u.test(amountWei) ||
    !transactionHash ||
    !/^0x[a-f0-9]{64}$/u.test(transactionHash)
  ) {
    return jsonError("A valid amountWei and transactionHash are required.", 400);
  }

  try {
    const fromWalletAddress = normalizeAddress(payload.fromWalletAddress);
    const toWalletAddress = normalizeAddress(payload.toWalletAddress);

    if (
      !/^0x[a-f0-9]{40}$/u.test(fromWalletAddress) ||
      !/^0x[a-f0-9]{40}$/u.test(toWalletAddress)
    ) {
      return jsonError("Valid fromWalletAddress and toWalletAddress are required.", 400);
    }

    if (payload.action === "record_send") {
      await recordWalletAppSendTransfer({
        amountWei,
        fromWalletAddress,
        toWalletAddress,
        transactionHash,
      });
    } else if (payload.action === "confirm_send") {
      await confirmWalletAppSendTransfer({
        amountWei,
        fromWalletAddress,
        toWalletAddress,
        transactionHash,
      });
    } else {
      return jsonError("Unsupported wallet transfer action.", 400);
    }

    return Response.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update wallet history.";
    const status = message.toLowerCase().includes("not found") ? 404 : 500;

    return jsonError(message, status);
  }
}
