import type {
  ContentFeedLoadResponse,
  ContentFeedResponse,
} from "@/lib/content";
import {
  getNetworkFeedForMember,
  getPublicNetworkFeedForReferralCode,
} from "@/lib/content-service";
import { defaultLocale, hasLocale } from "@/lib/i18n";
import {
  getMemberRegistrationStatus,
  syncMemberRegistration,
} from "@/lib/member-service";
import type { SyncMemberRequest } from "@/lib/member";
import { validateMemberWalletOwner } from "@/lib/member-owner";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawEmail = url.searchParams.get("email");
  const rawLocale = url.searchParams.get("locale");
  const rawReferralCode = url.searchParams.get("referralCode");
  const rawWalletAddress = url.searchParams.get("walletAddress");

  if (rawReferralCode) {
    try {
      const response = await getPublicNetworkFeedForReferralCode(
        rawReferralCode,
        rawLocale && hasLocale(rawLocale) ? rawLocale : defaultLocale,
      );
      return Response.json({
        items: response.items,
        member: null,
        nextCursor: response.nextCursor,
        validationError: null,
      } satisfies ContentFeedLoadResponse);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load network feed.";

      return jsonError(message, 500);
    }
  }

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

    const response: ContentFeedResponse = await getNetworkFeedForMember(
      authorization.normalizedEmail,
      rawLocale && hasLocale(rawLocale) ? rawLocale : defaultLocale,
    );
    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load network feed.";
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
      return jsonError("Member not found.", 404);
    }

    if (sync.validationError) {
      const response: ContentFeedLoadResponse = {
        items: [],
        member: sync.member,
        nextCursor: null,
        validationError: sync.validationError,
      };

      return Response.json(response);
    }

    if (sync.member.status !== "completed") {
      const response: ContentFeedLoadResponse = {
        items: [],
        member: sync.member,
        nextCursor: null,
        validationError: null,
      };

      return Response.json(response);
    }

    const feed = await getNetworkFeedForMember(
      sync.member.email,
      hasLocale(sync.member.locale) ? sync.member.locale : defaultLocale,
    );
    const response: ContentFeedLoadResponse = {
      items: feed.items,
      member: sync.member,
      nextCursor: feed.nextCursor,
      validationError: null,
    };

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load network feed.";
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
