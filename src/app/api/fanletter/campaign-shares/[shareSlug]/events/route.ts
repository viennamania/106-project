import type {
  FanletterCampaignEventCreateRequest,
  FanletterCampaignResponse,
} from "@/lib/fanletter-campaign";
import { recordFanletterCampaignEvent } from "@/lib/fanletter-campaign-service";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ shareSlug: string }> },
) {
  const { shareSlug } = await context.params;
  let body: FanletterCampaignEventCreateRequest | null = null;

  try {
    body = (await request.json()) as FanletterCampaignEventCreateRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  try {
    const response: FanletterCampaignResponse = {
      campaign: await recordFanletterCampaignEvent({
        body: body ?? {},
        shareSlug: decodeURIComponent(shareSlug),
      }),
    };

    return Response.json(response, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to record event.";
    const status =
      message === "Campaign not found."
        ? 404
        : message === "Campaign share link is not active."
          ? 409
          : message.endsWith("is required.")
            ? 400
            : 500;

    return jsonError(message, status);
  }
}
