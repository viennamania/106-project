import type {
  ContentOrderVerifyRequest,
  ContentOrderVerifyResponse,
} from "@/lib/content";
import { verifyContentOrderForMember } from "@/lib/content-service";
import { validateMemberWalletOwner } from "@/lib/member-owner";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await context.params;
  let body: ContentOrderVerifyRequest | null = null;

  try {
    body = (await request.json()) as ContentOrderVerifyRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (!body?.email) {
    return jsonError("email is required.", 400);
  }

  if (!body.walletAddress) {
    return jsonError("walletAddress is required.", 400);
  }

  if (!body.txHash?.trim()) {
    return jsonError("txHash is required.", 400);
  }

  try {
    const authorization = await validateMemberWalletOwner({
      email: body.email,
      walletAddress: body.walletAddress,
    });

    if (authorization.error) {
      return authorization.error;
    }

    const response: ContentOrderVerifyResponse =
      await verifyContentOrderForMember(orderId, {
        ...body,
        email: authorization.normalizedEmail,
      });

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to verify content order.";
    const status =
      message === "Member not found." || message === "Content order not found."
        ? 404
        : message === "Completed signup is required."
          ? 403
          : message.endsWith("is required.") ||
              message === "Valid transaction hash is required." ||
              message === "Content order is not payable." ||
              message === "Transaction has already been used." ||
              message === "Transaction is not confirmed successfully." ||
              message === "Matching USDT transfer log not found in receipt." ||
              message === "Transaction is outside the order payment window."
            ? 400
            : 500;

    return jsonError(message, status);
  }
}
