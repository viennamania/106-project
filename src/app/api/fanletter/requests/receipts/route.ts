import type { FanletterFanRequestsResponse } from "@/lib/content";
import { getFanletterFanRequestsForReceiptIds } from "@/lib/fanletter-fan-request-service";

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 30;

type ReceiptLookupRequest = {
  pageSize?: unknown;
  requestIds?: unknown;
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function readPageSize(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(parsed)));
}

function redactRequesterEmail(
  response: FanletterFanRequestsResponse,
): FanletterFanRequestsResponse {
  return {
    pageInfo: response.pageInfo,
    requests: response.requests.map((request) => ({
      ...request,
      requesterEmail: null,
    })),
  };
}

export async function POST(request: Request) {
  let body: ReceiptLookupRequest | null = null;

  try {
    body = (await request.json()) as ReceiptLookupRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  try {
    const response = await getFanletterFanRequestsForReceiptIds({
      pageSize: readPageSize(body?.pageSize),
      requestIds: Array.isArray(body?.requestIds) ? body.requestIds : [],
    });

    return Response.json(redactRequesterEmail(response));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load fan requests.";

    return jsonError(message, 500);
  }
}
