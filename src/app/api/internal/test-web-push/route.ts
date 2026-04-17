import { sendTestNotificationToMember } from "@/lib/notifications-service";

export const runtime = "nodejs";
export const maxDuration = 60;

type TestWebPushRequestBody = {
  body?: unknown;
  email?: unknown;
  href?: unknown;
  title?: unknown;
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function getInternalToken() {
  return (
    process.env.RECONCILE_API_TOKEN?.trim() ??
    process.env.RAILWAY_RECONCILE_TOKEN?.trim() ??
    ""
  );
}

function isAuthorized(request: Request) {
  const expectedToken = getInternalToken();

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

async function readRequestBody(request: Request) {
  const payloadText = await request.text();

  if (!payloadText.trim()) {
    throw new Error("JSON body is required.");
  }

  let body: TestWebPushRequestBody;

  try {
    body = JSON.parse(payloadText) as TestWebPushRequestBody;
  } catch {
    throw new Error("Invalid JSON body.");
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new Error("JSON body must be an object.");
  }

  if (typeof body.email !== "string" || !body.email.trim()) {
    throw new Error("email is required.");
  }

  if (body.title != null && typeof body.title !== "string") {
    throw new Error("title must be a string.");
  }

  if (body.body != null && typeof body.body !== "string") {
    throw new Error("body must be a string.");
  }

  if (body.href != null && typeof body.href !== "string") {
    throw new Error("href must be a string.");
  }

  return {
    body: typeof body.body === "string" ? body.body.trim() : undefined,
    email: body.email.trim(),
    href: typeof body.href === "string" ? body.href.trim() : undefined,
    title: typeof body.title === "string" ? body.title.trim() : undefined,
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

  let body: {
    body?: string;
    email: string;
    href?: string;
    title?: string;
  };

  try {
    body = await readRequestBody(request);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Invalid JSON body.",
      400,
    );
  }

  try {
    const result = await sendTestNotificationToMember(body);

    return Response.json({
      ...result,
      ranAt: new Date().toISOString(),
    });
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Failed to send the test web push notification.",
      500,
    );
  }
}
