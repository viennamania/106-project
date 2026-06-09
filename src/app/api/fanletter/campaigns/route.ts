import type {
  FanletterCampaignCreateRequest,
  FanletterCampaignResponse,
} from "@/lib/fanletter-campaign";
import {
  createFanletterCampaign,
  listFanletterCampaigns,
} from "@/lib/fanletter-campaign-service";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function readPageSize(value: string | null) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? Math.max(1, Math.floor(parsed)) : 30;
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  try {
    return Response.json(
      await listFanletterCampaigns({
        pageSize: readPageSize(url.searchParams.get("pageSize")),
        status: url.searchParams.get("status"),
      }),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load campaigns.";

    return jsonError(
      message,
      message === "Unsupported campaign status." ? 400 : 500,
    );
  }
}

export async function POST(request: Request) {
  let body: FanletterCampaignCreateRequest | null = null;

  try {
    body = (await request.json()) as FanletterCampaignCreateRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  try {
    const response: FanletterCampaignResponse = {
      campaign: await createFanletterCampaign(body ?? {}),
    };

    return Response.json(response, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create campaign.";

    return jsonError(message, message.endsWith("is required.") ? 400 : 500);
  }
}
