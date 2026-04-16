import { backfillAppNotifications } from "@/lib/notifications-service";

export const runtime = "nodejs";
export const maxDuration = 60;

type BackfillRequestBody = {
  email?: unknown;
  limit?: unknown;
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

  const result: {
    email?: string;
    limit?: number;
  } = {};

  if (body.email != null) {
    if (typeof body.email !== "string") {
      throw new Error("email must be a string.");
    }

    const email = body.email.trim();

    if (email) {
      result.email = email;
    }
  }

  if (body.limit != null) {
    if (typeof body.limit !== "number" || !Number.isFinite(body.limit)) {
      throw new Error("limit must be a finite number.");
    }

    result.limit = body.limit;
  }

  return result;
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

  let body: {
    email?: string;
    limit?: number;
  } = {};

  try {
    body = await readBackfillRequestBody(request);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Invalid JSON body.",
      400,
    );
  }

  try {
    const result = await backfillAppNotifications({
      email: body.email,
      limit: body.limit,
    });

    return Response.json({
      ...result,
      ranAt: new Date().toISOString(),
    });
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Failed to backfill app notifications.",
      500,
    );
  }
}
