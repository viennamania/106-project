import {
  tryGetFanletterAIStarStoredSocialAccount,
} from "@/lib/fanletter-ai-star-social-accounts";
import { normalizeFanletterStarId } from "@/lib/fanletter-routing";
import type { FanletterSocialPlatform } from "@/mock/fanletter-social-accounts";

function normalizePlatform(value: string | null): FanletterSocialPlatform {
  return value === "tiktok" ? "tiktok" : "tiktok";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const starId = normalizeFanletterStarId(url.searchParams.get("starId"));

  if (!starId) {
    return Response.json(
      {
        account: null,
        error: "A valid AI Star id is required.",
        mode: "server",
      },
      { status: 400 },
    );
  }

  const platform = normalizePlatform(url.searchParams.get("platform"));
  const account = await tryGetFanletterAIStarStoredSocialAccount({
    platform,
    starId,
  });

  return Response.json({
    account,
    mode: "server",
    source: account ? "server" : "none",
  });
}
