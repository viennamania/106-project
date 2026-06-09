import type {
  FanletterCampaignResponse,
  FanletterCampaignStatusUpdateRequest,
} from "@/lib/fanletter-campaign";
import { updateFanletterCampaignStatus } from "@/lib/fanletter-campaign-service";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ campaignId: string }> },
) {
  const { campaignId } = await context.params;
  let body: FanletterCampaignStatusUpdateRequest | null = null;

  try {
    body = (await request.json()) as FanletterCampaignStatusUpdateRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  try {
    const response: FanletterCampaignResponse = {
      campaign: await updateFanletterCampaignStatus({
        campaignId,
        status: body?.status,
      }),
    };

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update campaign.";
    const status =
      message === "Campaign not found."
        ? 404
        : message.endsWith("is required.") ||
            message === "Unsupported campaign status."
          ? 400
          : 500;

    return jsonError(message, status);
  }
}
