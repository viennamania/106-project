import type {
  ContentOrderCreateRequest,
  ContentOrderCreateResponse,
} from "@/lib/content";
import { createContentOrderForMember } from "@/lib/content-service";
import { validateMemberWalletOwner } from "@/lib/member-owner";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let body: ContentOrderCreateRequest | null = null;

  try {
    body = (await request.json()) as ContentOrderCreateRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (!body?.email) {
    return jsonError("email is required.", 400);
  }

  if (!body.walletAddress) {
    return jsonError("walletAddress is required.", 400);
  }

  if (!body.contentId?.trim()) {
    return jsonError("contentId is required.", 400);
  }

  try {
    const authorization = await validateMemberWalletOwner({
      email: body.email,
      walletAddress: body.walletAddress,
    });

    if (authorization.error) {
      return authorization.error;
    }

    const response: ContentOrderCreateResponse =
      await createContentOrderForMember({
        ...body,
        email: authorization.normalizedEmail,
      });

    return Response.json(response, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create content order.";
    const status =
      message === "Member not found." || message === "Content not found."
        ? 404
        : message === "Completed signup is required." ||
            message === "Content is not available in your network."
          ? 403
          : message.endsWith("is required.") ||
              message === "This content is free." ||
              message === "Authors can already access their own content." ||
              message === "Content already unlocked."
            ? 400
            : 500;

    return jsonError(message, status);
  }
}
