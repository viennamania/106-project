import type {
  ContentDetailLoadResponse,
  ContentDetailResponse,
  ContentPostMutationResponse,
  ContentPostUpdateRequest,
} from "@/lib/content";
import {
  getMemberRegistrationStatus,
  syncMemberRegistration,
} from "@/lib/member-service";
import { serializeMember, type SyncMemberRequest } from "@/lib/member";
import { validateMemberWalletOwner } from "@/lib/member-owner";
import {
  getPublicContentPreview,
  getContentDetailForMember,
  updateContentPostForMember,
} from "@/lib/content-service";

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

  if (!rawEmail) {
    return jsonError("email query parameter is required.", 400);
  }

  if (!rawWalletAddress) {
    return jsonError("walletAddress query parameter is required.", 400);
  }

  try {
    const authorization = await validateMemberWalletOwner({
      allowedStatuses: ["completed", "pending_payment"],
      email: rawEmail,
      walletAddress: rawWalletAddress,
    });

    if (authorization.error) {
      return authorization.error;
    }

    const authorizedMember = authorization.member;

    if (!authorizedMember) {
      return jsonError("Member not found.", 404);
    }

    if (authorizedMember.status !== "completed") {
      const response: ContentDetailLoadResponse = {
        content: null,
        gateReason: "signup",
        member: serializeMember(authorizedMember),
        validationError: null,
      };

      return Response.json(response);
    }

    try {
      const detail: ContentDetailResponse = await getContentDetailForMember(
        contentId,
        authorization.normalizedEmail,
      );

      const response: ContentDetailLoadResponse = {
        content: detail.content,
        gateReason: null,
        member: detail.member,
        validationError: null,
      };

      return Response.json(response);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load content.";

      if (
        message === "Content is not available in your network." ||
        message === "This content requires a paid unlock."
      ) {
        const preview = await getPublicContentPreview(contentId);

        if (!preview) {
          throw error;
        }

        const response: ContentDetailLoadResponse = {
          content: preview,
          gateReason:
            message === "This content requires a paid unlock." ? "paid" : "network",
          member: serializeMember(authorizedMember),
          validationError: null,
        };

        return Response.json(response);
      }

      throw error;
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load content.";
    const status =
      message === "Member not found."
        ? 404
        : message === "Completed signup is required."
          ? 403
          : message === "Content not found."
            ? 404
            : message === "Content is not available in your network." ||
                message === "This content requires a paid unlock."
              ? 403
              : 500;

    return jsonError(message, status);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ contentId: string }> },
) {
  const { contentId } = await context.params;
  let body: SyncMemberRequest | null = null;

  try {
    body = (await request.json()) as SyncMemberRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (!body?.email) {
    return jsonError("email is required.", 400);
  }

  if (!body.walletAddress) {
    return jsonError("walletAddress is required.", 400);
  }

  if (!body.chainName?.trim()) {
    return jsonError("chainName is required.", 400);
  }

  if (!body.locale?.trim()) {
    return jsonError("locale is required.", 400);
  }

  try {
    const existingMember = await getMemberRegistrationStatus(body.email);

    if (existingMember) {
      const authorization = await validateMemberWalletOwner({
        allowedStatuses: ["completed", "pending_payment"],
        email: body.email,
        walletAddress: body.walletAddress,
      });

      if (authorization.error) {
        return authorization.error;
      }
    }

    const sync = await syncMemberRegistration({
      ...body,
      syncMode: "light",
    });

    if (!sync.member) {
      const response: ContentDetailLoadResponse = {
        content: null,
        gateReason: "signup",
        member: null,
        validationError: null,
      };

      return Response.json(response);
    }

    if (sync.validationError) {
      const response: ContentDetailLoadResponse = {
        content: null,
        gateReason: "signup",
        member: sync.member,
        validationError: sync.validationError,
      };

      return Response.json(response);
    }

    if (sync.member.status !== "completed") {
      const response: ContentDetailLoadResponse = {
        content: null,
        gateReason: "signup",
        member: sync.member,
        validationError: null,
      };

      return Response.json(response);
    }

    let detail;

    try {
      detail = await getContentDetailForMember(contentId, sync.member.email);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load content.";

      if (
        (message === "Content is not available in your network." ||
          message === "This content requires a paid unlock.")
      ) {
        const preview = await getPublicContentPreview(contentId);

        if (!preview) {
          throw error;
        }

        const response: ContentDetailLoadResponse = {
          content: preview,
          gateReason:
            message === "This content requires a paid unlock." ? "paid" : "network",
          member: sync.member,
          validationError: null,
        };

        return Response.json(response);
      }

      throw error;
    }

    const response: ContentDetailLoadResponse = {
      content: detail.content,
      gateReason: null,
      member: sync.member,
      validationError: null,
    };

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load content.";
    const status =
      message === "Member not found."
        ? 404
        : message === "Completed signup is required." ||
            message === "This wallet is not authorized for the requested member."
          ? 403
          : message === "Content not found."
            ? 404
            : message === "Content is not available in your network." ||
                message === "This content requires a paid unlock."
              ? 403
              : 500;

    return jsonError(message, status);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ contentId: string }> },
) {
  const { contentId } = await context.params;
  let body: Omit<ContentPostUpdateRequest, "contentId"> | null = null;

  try {
    body = (await request.json()) as Omit<ContentPostUpdateRequest, "contentId">;
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

    const response: ContentPostMutationResponse = {
      content: await updateContentPostForMember({
        ...body,
        contentId,
        email: authorization.normalizedEmail,
      }),
    };

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update content.";
    const status =
      message === "Member not found."
        ? 404
        : message === "Completed signup is required."
          ? 403
          : message === "Content not found."
            ? 404
            : message === "Only the author can update this content."
              ? 403
              : message ===
                    "THIRDWEB_SECRET_KEY is required to create seller wallets." ||
                  message === "Failed to create seller wallet."
                ? 400
              : 500;

    return jsonError(message, status);
  }
}
