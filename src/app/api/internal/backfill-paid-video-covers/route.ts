import {
  backfillPaidVideoCovers,
  type PaidVideoCoverBackfillMode,
  paidVideoCoverBackfillStyles,
  type PaidVideoCoverBackfillStyle,
} from "@/lib/paid-video-cover-backfill-service";

export const runtime = "nodejs";
export const maxDuration = 300;

type BackfillRequestBody = {
  allowAiFallback?: unknown;
  coverMode?: unknown;
  contentId?: unknown;
  email?: unknown;
  includeDrafts?: unknown;
  includeGeneratedVideos?: unknown;
  limit?: unknown;
  replaceExistingCovers?: unknown;
  style?: unknown;
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

function readOptionalStyle(value: unknown) {
  if (value == null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error("style must be a string.");
  }

  if (
    !paidVideoCoverBackfillStyles.includes(
      value as PaidVideoCoverBackfillStyle,
    )
  ) {
    throw new Error(
      `style must be one of: ${paidVideoCoverBackfillStyles.join(", ")}.`,
    );
  }

  return value as PaidVideoCoverBackfillStyle;
}

function readOptionalCoverMode(value: unknown) {
  if (value == null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error("coverMode must be a string.");
  }

  if (value !== "ai" && value !== "video-frame") {
    throw new Error("coverMode must be one of: ai, video-frame.");
  }

  return value as PaidVideoCoverBackfillMode;
}

async function readBackfillRequestBody(request: Request) {
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
    allowAiFallback: readOptionalBoolean(body.allowAiFallback, "allowAiFallback"),
    coverMode: readOptionalCoverMode(body.coverMode),
    contentId: readOptionalString(body.contentId, "contentId"),
    email: readOptionalString(body.email, "email"),
    includeDrafts: readOptionalBoolean(body.includeDrafts, "includeDrafts"),
    includeGeneratedVideos: readOptionalBoolean(
      body.includeGeneratedVideos,
      "includeGeneratedVideos",
    ),
    limit: readOptionalLimit(body.limit),
    replaceExistingCovers: readOptionalBoolean(
      body.replaceExistingCovers,
      "replaceExistingCovers",
    ),
    style: readOptionalStyle(body.style),
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

  let body: Awaited<ReturnType<typeof readBackfillRequestBody>>;

  try {
    body = await readBackfillRequestBody(request);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Invalid JSON body.",
      400,
    );
  }

  try {
    const result = await backfillPaidVideoCovers(body);

    return Response.json({
      ...result,
      ranAt: new Date().toISOString(),
    });
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Failed to backfill paid video covers.",
      500,
    );
  }
}
