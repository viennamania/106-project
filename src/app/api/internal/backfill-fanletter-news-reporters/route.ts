import {
  backfillFanletterNewsReporterProfiles,
  type FanletterNewsReporterBackfillInput,
} from "@/lib/fanletter-news-report-service";

export const runtime = "nodejs";
export const maxDuration = 300;

type BackfillRequestBody = {
  limit?: unknown;
  locale?: unknown;
  reporterReferralCode?: unknown;
  reportId?: unknown;
  write?: unknown;
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function getBackfillToken() {
  return (
    process.env.RECONCILE_API_TOKEN?.trim() ??
    process.env.RAILWAY_RECONCILE_TOKEN?.trim() ??
    ""
  );
}

function isAuthorized(request: Request) {
  const expectedToken = getBackfillToken();

  if (!expectedToken) {
    throw new Error(
      "RECONCILE_API_TOKEN or RAILWAY_RECONCILE_TOKEN is not configured.",
    );
  }

  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return false;
  }

  return authorization.slice("Bearer ".length).trim() === expectedToken;
}

function readOptionalString(value: unknown, field: string) {
  if (value == null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error(`${field} must be a string.`);
  }

  return value.trim() || undefined;
}

function readOptionalBoolean(value: unknown, field: string) {
  if (value == null) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new Error(`${field} must be a boolean.`);
  }

  return value;
}

function readOptionalLimit(value: unknown) {
  if (value == null) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("limit must be a finite number.");
  }

  return value;
}

async function readBackfillRequestBody(
  request: Request,
): Promise<FanletterNewsReporterBackfillInput> {
  const payloadText = await request.text();

  if (!payloadText.trim()) {
    return {};
  }

  let body: BackfillRequestBody;

  try {
    body = JSON.parse(payloadText) as BackfillRequestBody;
  } catch {
    throw new Error("Invalid JSON body.");
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new Error("JSON body must be an object.");
  }

  return {
    limit: readOptionalLimit(body.limit),
    locale: readOptionalString(body.locale, "locale"),
    reporterReferralCode: readOptionalString(
      body.reporterReferralCode,
      "reporterReferralCode",
    ),
    reportId: readOptionalString(body.reportId, "reportId"),
    write: readOptionalBoolean(body.write, "write"),
  };
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return jsonError("Unauthorized.", 401);
    }
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Internal auth error.",
      500,
    );
  }

  let body: FanletterNewsReporterBackfillInput;

  try {
    body = await readBackfillRequestBody(request);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Invalid JSON body.",
      400,
    );
  }

  try {
    const result = await backfillFanletterNewsReporterProfiles(body);

    return Response.json({
      ...result,
      ranAt: new Date().toISOString(),
    });
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Failed to backfill AIAVpark news reporter profiles.",
      500,
    );
  }
}
