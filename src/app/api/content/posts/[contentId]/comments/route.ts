import type {
  ContentCommentCreateRequest,
  ContentCommentsResponse,
} from "@/lib/content";
import {
  addContentCommentForMember,
  getContentCommentsForContent,
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

    const response: ContentCommentsResponse = await getContentCommentsForContent(
      contentId,
      viewerEmail,
    );

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load comments.";
    const status = message === "Content not found." ? 404 : 500;

    return jsonError(message, status);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ contentId: string }> },
) {
  const { contentId } = await context.params;
  let body: ContentCommentCreateRequest | null = null;

  try {
    body = (await request.json()) as ContentCommentCreateRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (!body?.email) {
    return jsonError("email is required.", 400);
  }

  if (!body.walletAddress) {
    return jsonError("walletAddress is required.", 400);
  }

  if (!body.body?.trim()) {
    return jsonError("body is required.", 400);
  }

  try {
    const authorization = await validateMemberWalletOwner({
      email: body.email,
      walletAddress: body.walletAddress,
    });

    if (authorization.error) {
      return authorization.error;
    }

    const response = await addContentCommentForMember({
      body: body.body,
      contentId,
      email: authorization.normalizedEmail,
    });

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create comment.";
    const status =
      message === "Content not found."
        ? 404
        : message === "Completed signup is required." ||
            message === "This wallet is not authorized for the requested member."
          ? 403
          : message === "Comment body is required." ||
              message.endsWith("is required.")
            ? 400
            : 500;

    return jsonError(message, status);
  }
}
