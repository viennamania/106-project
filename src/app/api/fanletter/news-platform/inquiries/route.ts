import { createHash, randomUUID } from "node:crypto";

import { createFanletterNewsPlatformInquiry } from "@/lib/fanletter-news-platform-inquiry";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function getErrorStatus(message: string) {
  if (
    message === "Inquiry name is required." ||
    message === "Valid inquiry email is required." ||
    message === "Inquiry message is required." ||
    message === "Inquiry contains blocked content."
  ) {
    return 400;
  }

  if (message === "Duplicate inquiry.") {
    return 409;
  }

  if (message === "Too many inquiries. Please try again later.") {
    return 429;
  }

  return 500;
}

function getRequesterFingerprint(request: Request) {
  const forwardedFor =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const realIp = request.headers.get("x-real-ip")?.trim() ?? "";
  const userAgent = request.headers.get("user-agent")?.trim().slice(0, 180) ?? "";
  const fingerprintSource = `${forwardedFor || realIp}|${userAgent}`;

  if (!fingerprintSource.replace("|", "").trim()) {
    return null;
  }

  return createHash("sha256").update(fingerprintSource).digest("hex").slice(0, 40);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" ? value : null;
}

export async function POST(request: Request) {
  let body: unknown = null;

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (!isRecord(body)) {
    return jsonError("Invalid JSON body.", 400);
  }

  const honeypot = readString(body.website);

  if (honeypot?.trim()) {
    return Response.json({
      inquiry: {
        createdAt: new Date().toISOString(),
        inquiryId: randomUUID(),
        status: "new",
      },
    });
  }

  try {
    const inquiry = await createFanletterNewsPlatformInquiry({
      email: readString(body.email),
      inquiryType: readString(body.inquiryType),
      locale: readString(body.locale),
      message: readString(body.message),
      name: readString(body.name),
      organization: readString(body.organization),
      referralCode: readString(body.referralCode),
      requesterFingerprint: getRequesterFingerprint(request),
      sourcePath: readString(body.sourcePath),
      sourceUrl: readString(body.sourceUrl),
      userAgent: request.headers.get("user-agent"),
    });

    return Response.json({ inquiry });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create inquiry.";

    return jsonError(message, getErrorStatus(message));
  }
}
