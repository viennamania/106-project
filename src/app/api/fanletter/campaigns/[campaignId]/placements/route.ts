import type {
  FanletterCampaignPlacementAttachRequest,
  FanletterCampaignResponse,
} from "@/lib/fanletter-campaign";
import { attachFanletterCampaignNewsCutPlacement } from "@/lib/fanletter-campaign-service";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function getErrorStatus(message: string) {
  if (message === "Campaign not found.") {
    return 404;
  }

  if (
    message === "campaignId is required." ||
    message === "shareUrl or shareId is required." ||
    message === "Invalid news cut share URL." ||
    message === "news cut shareId is required." ||
    message === "Unsupported campaign placement channel."
  ) {
    return 400;
  }

  return 500;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ campaignId: string }> },
) {
  const { campaignId } = await context.params;
  let body: FanletterCampaignPlacementAttachRequest | null = null;

  try {
    body = (await request.json()) as FanletterCampaignPlacementAttachRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  try {
    const response: FanletterCampaignResponse = {
      campaign: await attachFanletterCampaignNewsCutPlacement({
        body: body ?? {},
        campaignId,
      }),
    };

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to attach campaign placement.";

    return jsonError(message, getErrorStatus(message));
  }
}
