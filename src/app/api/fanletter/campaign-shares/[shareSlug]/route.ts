import type { FanletterCampaignResponse } from "@/lib/fanletter-campaign";
import { getFanletterCampaignByShareSlug } from "@/lib/fanletter-campaign-service";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ shareSlug: string }> },
) {
  const { shareSlug } = await context.params;
  const campaign = await getFanletterCampaignByShareSlug(
    decodeURIComponent(shareSlug),
  );

  if (!campaign) {
    return jsonError("Campaign not found.", 404);
  }

  const response: FanletterCampaignResponse = { campaign };

  return Response.json(response);
}
