import type { CreatorStudioPostsLoadResponse } from "@/lib/content";
import { getCreatorStudioPostsForMember } from "@/lib/content-service";
import {
  getMemberRegistrationStatus,
  syncMemberRegistration,
} from "@/lib/member-service";
import type { SyncMemberRequest } from "@/lib/member";
import { validateMemberWalletOwner } from "@/lib/member-owner";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

const EMPTY_SUMMARY: CreatorStudioPostsLoadResponse["summary"] = {
  all: 0,
  archived: 0,
  draft: 0,
  published: 0,
};

type CreatorStudioPostsLoadRequest = SyncMemberRequest & {
  page?: number;
  pageSize?: number;
  q?: string | null;
  status?: "all" | "archived" | "draft" | "published" | null;
};

export async function POST(request: Request) {
  let body: CreatorStudioPostsLoadRequest | null = null;

  try {
    body = (await request.json()) as CreatorStudioPostsLoadRequest;
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
      return jsonError("Member not found.", 404);
    }

    if (sync.validationError) {
      const response: CreatorStudioPostsLoadResponse = {
        member: sync.member,
        pageInfo: null,
        posts: [],
        profile: null,
        summary: EMPTY_SUMMARY,
        validationError: sync.validationError,
      };

      return Response.json(response);
    }

    if (sync.member.status !== "completed") {
      const response: CreatorStudioPostsLoadResponse = {
        member: sync.member,
        pageInfo: null,
        posts: [],
        profile: null,
        summary: EMPTY_SUMMARY,
        validationError: null,
      };

      return Response.json(response);
    }

    const posts = await getCreatorStudioPostsForMember(sync.member.email, {
      page: body.page,
      pageSize: body.pageSize,
      query: body.q,
      status:
        body.status === "all" ||
        body.status === "archived" ||
        body.status === "draft" ||
        body.status === "published"
          ? body.status
          : null,
    });

    const response: CreatorStudioPostsLoadResponse = {
      member: sync.member,
      pageInfo: posts.pageInfo,
      posts: posts.posts,
      profile: posts.profile,
      summary: posts.summary,
      validationError: null,
    };

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load creator posts.";
    const status =
      message === "Member not found."
        ? 404
        : message === "Completed signup is required." ||
            message === "This wallet is not authorized for the requested member."
          ? 403
          : 500;

    return jsonError(message, status);
  }
}
