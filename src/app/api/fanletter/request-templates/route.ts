import type { FanletterFanRequestTemplatesResponse } from "@/lib/content";
import { listFanletterFanRequestTemplates } from "@/lib/fanletter-fan-request-template-service";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function readLocale(value: string | null): Locale {
  return value && hasLocale(value) ? value : defaultLocale;
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  try {
    const response: FanletterFanRequestTemplatesResponse =
      await listFanletterFanRequestTemplates({
        creatorReferralCode: url.searchParams.get("creatorReferralCode"),
        locale: readLocale(url.searchParams.get("locale")),
        requestType: url.searchParams.get("requestType"),
      });

    return Response.json(response);
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Failed to load fan request templates.",
      500,
    );
  }
}
