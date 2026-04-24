import type {
  ContentPostCreateRequest,
  ContentPostMutationResponse,
  CreatorStudioPostsResponse,
} from "@/lib/content";
import { validateMemberWalletOwner } from "@/lib/member-owner";
import {
  createContentPostForMember,
  getCreatorStudioPostsForMember,
} from "@/lib/content-service";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawEmail = url.searchParams.get("email");
  const rawWalletAddress = url.searchParams.get("walletAddress");
  const rawPage = url.searchParams.get("page");
  const rawPageSize = url.searchParams.get("pageSize");
  const rawQuery = url.searchParams.get("q");
  const rawStatus = url.searchParams.get("status");

  if (!rawEmail) {
    return jsonError("email query parameter is required.", 400);
  }

  if (!rawWalletAddress) {
    return jsonError("walletAddress query parameter is required.", 400);
  }

  try {
    const authorization = await validateMemberWalletOwner({
      email: rawEmail,
      walletAddress: rawWalletAddress,
    });

    if (authorization.error) {
      return authorization.error;
    }

    const response: CreatorStudioPostsResponse = await getCreatorStudioPostsForMember(
      authorization.normalizedEmail,
      rawPage || rawPageSize || rawQuery || rawStatus
        ? {
            page: rawPage ? Number(rawPage) : undefined,
            pageSize: rawPageSize ? Number(rawPageSize) : undefined,
            query: rawQuery,
            status:
              rawStatus === "all" ||
              rawStatus === "archived" ||
              rawStatus === "draft" ||
              rawStatus === "published"
                ? rawStatus
                : null,
          }
        : undefined,
    );
    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load creator posts.";
    const status =
      message === "Member not found."
        ? 404
        : message === "Completed signup is required."
          ? 403
          : 500;

    return jsonError(message, status);
  }
}

export async function POST(request: Request) {
  let body: ContentPostCreateRequest | null = null;

  try {
    body = (await request.json()) as ContentPostCreateRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (!body?.email) {
    return jsonError("email is required.", 400);
  }

  if (!body.walletAddress) {
    return jsonError("walletAddress is required.", 400);
  }

  if (!body.title?.trim()) {
    return jsonError("title is required.", 400);
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

    const response: ContentPostMutationResponse = {
      content: await createContentPostForMember({
        ...body,
        email: authorization.normalizedEmail,
      }),
    };

    return Response.json(response, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create content.";
    const status =
      message === "Member not found."
        ? 404
        : message === "Completed signup is required."
          ? 403
          : message.endsWith("is required.") ||
              message ===
                "THIRDWEB_SECRET_KEY is required to create seller wallets." ||
              message === "Failed to create seller wallet."
            ? 400
            : 500;

    return jsonError(message, status);
  }
}
