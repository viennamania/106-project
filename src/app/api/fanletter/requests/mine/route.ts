import type { FanletterFanRequestsResponse } from "@/lib/content";
import { getFanletterFanRequestsForRequester } from "@/lib/fanletter-fan-request-service";
import { validateMemberWalletOwner } from "@/lib/member-owner";

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 30;

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function getErrorStatus(message: string) {
  if (message === "requesterEmail is required.") {
    return 400;
  }

  return 500;
}

function readPageSize(value: string | null) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(parsed)));
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  try {
    const authorization = await validateMemberWalletOwner({
      email: url.searchParams.get("email"),
      walletAddress: url.searchParams.get("walletAddress"),
    });

    if (authorization.error) {
      return authorization.error;
    }

    const response: FanletterFanRequestsResponse =
      await getFanletterFanRequestsForRequester({
        pageSize: readPageSize(url.searchParams.get("pageSize")),
        requesterEmail: authorization.normalizedEmail,
      });

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load fan requests.";

    return jsonError(message, getErrorStatus(message));
  }
}
