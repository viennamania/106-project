import type {
  FanletterCampaignAnalyzeRequest,
  FanletterCampaignAnalyzeResponse,
} from "@/lib/fanletter-campaign";
import { buildFanletterCampaignDraft } from "@/lib/fanletter-campaign-service";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let body: FanletterCampaignAnalyzeRequest | null = null;

  try {
    body = (await request.json()) as FanletterCampaignAnalyzeRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  try {
    const response: FanletterCampaignAnalyzeResponse = {
      draft: buildFanletterCampaignDraft(body ?? {}),
    };

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to analyze campaign.";

    return jsonError(message, message.endsWith("is required.") ? 400 : 500);
  }
}
