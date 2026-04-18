import type { ContentFeedResponse } from "@/lib/content";
import { getNetworkFeedForMember } from "@/lib/content-service";
import { defaultLocale, hasLocale } from "@/lib/i18n";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawEmail = url.searchParams.get("email");
  const rawLocale = url.searchParams.get("locale");

  if (!rawEmail) {
    return jsonError("email query parameter is required.", 400);
  }

  try {
    const response: ContentFeedResponse = await getNetworkFeedForMember(
      rawEmail,
      rawLocale && hasLocale(rawLocale) ? rawLocale : defaultLocale,
    );
    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load network feed.";
    const status =
      message === "Member not found."
        ? 404
        : message === "Completed signup is required."
          ? 403
          : 500;

    return jsonError(message, status);
  }
}
