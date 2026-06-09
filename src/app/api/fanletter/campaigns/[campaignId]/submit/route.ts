import type { FanletterCampaignResponse } from "@/lib/fanletter-campaign";
import { submitFanletterCampaignForReview } from "@/lib/fanletter-campaign-service";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ campaignId: string }> },
) {
  const { campaignId } = await context.params;

  try {
    const response: FanletterCampaignResponse = {
      campaign: await submitFanletterCampaignForReview(campaignId),
    };

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to submit campaign.";
    const status =
      message === "Campaign not found."
        ? 404
        : message.endsWith("is required.")
          ? 400
          : 500;

    return jsonError(message, status);
  }
}
