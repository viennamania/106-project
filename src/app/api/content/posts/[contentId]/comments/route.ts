import type {
  ContentCommentCreateRequest,
  ContentCommentsResponse,
} from "@/lib/content";
import {
  addContentCommentForMember,
  getContentCommentsForContent,
} from "@/lib/content-service";
import { validateMemberWalletOwner } from "@/lib/member-owner";
import { readMemberServerSession } from "@/lib/member-server-session";

const DEFAULT_COMMENTS_PAGE_SIZE = 5;
const MAX_COMMENTS_PAGE_SIZE = 30;

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function readNonNegativeInteger(value: string | null) {
  const parsed = value ? Number.parseInt(value, 10) : 0;

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 0;
  }

  return parsed;
}

function readCommentsPageSize(value: string | null) {
  const parsed = value ? Number.parseInt(value, 10) : DEFAULT_COMMENTS_PAGE_SIZE;

  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_COMMENTS_PAGE_SIZE;
  }

  return Math.min(MAX_COMMENTS_PAGE_SIZE, Math.max(1, parsed));
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
    const session =
      rawEmail && rawWalletAddress ? null : await readMemberServerSession();
    const viewerCredentials =
      rawEmail && rawWalletAddress
        ? { email: rawEmail, walletAddress: rawWalletAddress }
        : session
          ? { email: session.email, walletAddress: session.walletAddress }
          : null;

    if (viewerCredentials) {
      const authorization = await validateMemberWalletOwner({
        email: viewerCredentials.email,
        walletAddress: viewerCredentials.walletAddress,
      });

      if (authorization.error) {
        return authorization.error;
      }

      viewerEmail = authorization.normalizedEmail;
    }

    const response: ContentCommentsResponse = await getContentCommentsForContent(
      contentId,
      viewerEmail,
      {
        offset: readNonNegativeInteger(url.searchParams.get("offset")),
        pageSize: readCommentsPageSize(url.searchParams.get("pageSize")),
      },
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
