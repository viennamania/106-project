import type { FanletterCharacterGrowthResponse } from "@/lib/fanletter-character-growth";
import { getFanletterCharacterGrowthForMember } from "@/lib/fanletter-character-growth-service";
import type { Locale } from "@/lib/i18n";
import { validateMemberWalletOwner } from "@/lib/member-owner";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function readLocale(value: string | null): Locale {
  return value === "ko" ? "ko" : "en";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawEmail = url.searchParams.get("email");
  const rawWalletAddress = url.searchParams.get("walletAddress");
  const locale = readLocale(url.searchParams.get("locale"));

  try {
    const authorization = await validateMemberWalletOwner({
      email: rawEmail,
      walletAddress: rawWalletAddress,
    });

    if (authorization.error) {
      return authorization.error;
    }

    const response: FanletterCharacterGrowthResponse = {
      growth: await getFanletterCharacterGrowthForMember({
        locale,
        member: authorization.member,
      }),
    };

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load FanLetter character growth.";

    return jsonError(message, 500);
  }
}
