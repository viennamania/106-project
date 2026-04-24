import type {
  ContentSellerWithdrawalRequest,
  ContentSellerWithdrawalResponse,
} from "@/lib/content";
import { withdrawCreatorSalesBalanceForMember } from "@/lib/content-service";
import { validateMemberWalletOwner } from "@/lib/member-owner";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let body: ContentSellerWithdrawalRequest | null = null;

  try {
    body = (await request.json()) as ContentSellerWithdrawalRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (!body?.email) {
    return jsonError("email is required.", 400);
  }

  if (!body.walletAddress) {
    return jsonError("walletAddress is required.", 400);
  }

  try {
    const authorization = await validateMemberWalletOwner({
      email: body.email,
      walletAddress: body.walletAddress,
    });

    if (authorization.error) {
      return authorization.error;
    }

    const response: ContentSellerWithdrawalResponse =
      await withdrawCreatorSalesBalanceForMember({
        ...body,
        email: authorization.normalizedEmail,
      });

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to withdraw seller wallet balance.";
    const status =
      message === "Member not found."
        ? 404
        : message === "Completed signup is required." ||
            message === "This wallet is not authorized for the requested member."
          ? 403
          : message.endsWith("is required.") ||
              message.endsWith("is invalid.") ||
              message === "Seller wallet is not configured." ||
              message === "Seller wallet USDT balance is empty." ||
              message ===
                "THIRDWEB_SECRET_KEY is required for seller wallet withdrawals."
            ? 400
            : 500;

    return jsonError(message, status);
  }
}
