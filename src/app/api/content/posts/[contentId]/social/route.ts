import type {
  ContentSocialActionRequest,
  ContentSocialResponse,
} from "@/lib/content";
import {
  getContentSocialSummaryForViewer,
  updateContentSocialActionForMember,
} from "@/lib/content-service";
import { validateMemberWalletOwner } from "@/lib/member-owner";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ contentId: string }> },
) {
  const { contentId } = await context.params;
  const url = new URL(request.url);
  const rawEmail = url.searchParams.get("email");
  const rawWalletAddress = url.searchParams.get("walletAddress");

  try {
    let viewerEmail: string | null = null;

    if (rawEmail && rawWalletAddress) {
      const authorization = await validateMemberWalletOwner({
        email: rawEmail,
        walletAddress: rawWalletAddress,
      });

      if (authorization.error) {
        return authorization.error;
      }

      viewerEmail = authorization.normalizedEmail;
    }

    const response: ContentSocialResponse = {
      social: await getContentSocialSummaryForViewer(contentId, viewerEmail),
    };

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load social state.";
    const status = message === "Content not found." ? 404 : 500;

    return jsonError(message, status);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ contentId: string }> },
) {
  const { contentId } = await context.params;
  let body: ContentSocialActionRequest | null = null;

  try {
    body = (await request.json()) as ContentSocialActionRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (!body?.email) {
    return jsonError("email is required.", 400);
  }

  if (!body.walletAddress) {
    return jsonError("walletAddress is required.", 400);
  }

  if (typeof body.value !== "boolean") {
    return jsonError("value is required.", 400);
  }

  try {
    const authorization = await validateMemberWalletOwner({
      email: body.email,
      walletAddress: body.walletAddress,
    });

    if (authorization.error) {
      return authorization.error;
    }

    const response = await updateContentSocialActionForMember({
      action: body.action,
      contentId,
      email: authorization.normalizedEmail,
      value: body.value,
    });

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update social state.";
    const status =
      message === "Content not found."
        ? 404
        : message === "Completed signup is required." ||
            message === "This wallet is not authorized for the requested member."
          ? 403
          : message === "Unsupported social action."
            ? 400
            : 500;

    return jsonError(message, status);
  }
}
