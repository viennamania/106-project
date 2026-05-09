import type { FanletterFollowedCharactersResponse } from "@/lib/content";
import { getFanletterFollowedCharactersForMember } from "@/lib/fanletter-follow-service";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { validateMemberWalletOwner } from "@/lib/member-owner";

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 50;

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function getErrorStatus(message: string) {
  if (message === "followerEmail is required.") {
    return 400;
  }

  return 500;
}

function readLocale(value: string | null): Locale {
  return value && hasLocale(value) ? value : defaultLocale;
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

    const response: FanletterFollowedCharactersResponse =
      await getFanletterFollowedCharactersForMember({
        followerEmail: authorization.normalizedEmail,
        locale: readLocale(url.searchParams.get("locale")),
        pageSize: readPageSize(url.searchParams.get("pageSize")),
      });

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load followed characters.";

    return jsonError(message, getErrorStatus(message));
  }
}
