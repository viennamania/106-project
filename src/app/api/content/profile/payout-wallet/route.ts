import type { CreatorProfileResponse } from "@/lib/content";
import { ensureCreatorPaidWalletForMember } from "@/lib/content-service";
import { isMemberAllowedForContentAutomation } from "@/lib/content-automation-service";
import { validateMemberWalletOwner } from "@/lib/member-owner";

type PayoutWalletCreateRequest = {
  email?: string;
  walletAddress?: string;
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let body: PayoutWalletCreateRequest | null = null;

  try {
    body = (await request.json()) as PayoutWalletCreateRequest;
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

    const response: CreatorProfileResponse = {
      automationAvailable: isMemberAllowedForContentAutomation(
        authorization.normalizedEmail,
      ),
      profile: await ensureCreatorPaidWalletForMember(
        authorization.normalizedEmail,
      ),
    };

    return Response.json(response, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create seller wallet.";
    const status =
      message === "Member not found."
        ? 404
        : message === "Completed signup is required." ||
            message === "This wallet is not authorized for the requested member."
          ? 403
          : message.endsWith("is required.")
            ? 400
            : 500;

    return jsonError(message, status);
  }
}
