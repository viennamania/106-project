import { put } from "@vercel/blob";

import { isAllowedFanletterNewsReportCoverSource } from "@/lib/fanletter-news-report-service";
import { normalizeEmail, normalizeReferralCode } from "@/lib/member";
import { validateMemberWalletOwner } from "@/lib/member-owner";
import { readMemberServerSession } from "@/lib/member-server-session";
import { getContentPostsCollection } from "@/lib/mongodb";

export const runtime = "nodejs";

const MAX_CROPPED_COVER_BYTES = 4 * 1024 * 1024;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function sanitizeBaseName(name: string) {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);

  return normalized || "fanletter-news-cover";
}

function resolveExtension(file: File) {
  if (file.type === "image/png") {
    return ".png";
  }

  if (file.type === "image/webp") {
    return ".webp";
  }

  return ".jpg";
}

function normalizeUploadPurpose(value: FormDataEntryValue | null) {
  return String(value ?? "").trim() === "teaser" ? "teaser" : "cover";
}

export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    return jsonError("BLOB_READ_WRITE_TOKEN is not configured.", 500);
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return jsonError("Invalid form data.", 400);
  }

  const contentId = String(formData.get("contentId") ?? "").trim();
  const file = formData.get("file");
  const requestEmail = normalizeEmail(String(formData.get("email") ?? ""));
  const purpose = normalizeUploadPurpose(formData.get("purpose"));
  const sourceImageUrl = String(formData.get("sourceImageUrl") ?? "").trim();
  const requestWalletAddress = String(
    formData.get("walletAddress") ?? "",
  ).trim();
  const session =
    requestEmail && requestWalletAddress
      ? null
      : await readMemberServerSession();
  const email =
    requestEmail || (session ? normalizeEmail(session.email) : "");
  const walletAddress =
    requestWalletAddress || (session?.walletAddress?.trim() ?? "");

  if (!contentId) {
    return jsonError("contentId is required.", 400);
  }

  if (!email) {
    return jsonError("email is required.", 400);
  }

  if (!(file instanceof File)) {
    return jsonError("file is required.", 400);
  }

  if (!sourceImageUrl) {
    return jsonError("sourceImageUrl is required.", 400);
  }

  if (!walletAddress) {
    return jsonError("walletAddress is required.", 400);
  }

  if (!allowedImageTypes.has(file.type)) {
    return jsonError("Only PNG, JPG, and WEBP images are supported.", 400);
  }

  if (file.size > MAX_CROPPED_COVER_BYTES) {
    return jsonError("Image must be 4MB or smaller.", 400);
  }

  const authorization = await validateMemberWalletOwner({
    allowedStatuses: ["completed", "pending_payment"],
    email,
    walletAddress,
  });

  if (authorization.error) {
    return authorization.error;
  }

  const reporterReferralCode = normalizeReferralCode(
    authorization.member?.referralCode,
  );

  if (!reporterReferralCode) {
    return jsonError("Connected account does not have a fan reporter code.", 403);
  }

  const postsCollection = await getContentPostsCollection();
  const post = await postsCollection.findOne({
    contentId,
    status: "published",
  });

  if (!post) {
    return jsonError("Content not found.", 404);
  }

  if (
    !isAllowedFanletterNewsReportCoverSource({
      imageUrl: sourceImageUrl,
      post,
    })
  ) {
    return jsonError("sourceImageUrl is not a saved cover candidate.", 400);
  }

  const pathname = [
    "fanletter-news-reports",
    reporterReferralCode,
    purpose === "teaser" ? "teaser-cuts" : "wide-covers",
    `${Date.now()}-${sanitizeBaseName(contentId)}${resolveExtension(file)}`,
  ].join("/");

  try {
    const uploaded = await put(pathname, file, {
      access: "public",
      addRandomSuffix: true,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
      contentType: file.type,
    });

    return Response.json({
      contentType: uploaded.contentType,
      pathname: uploaded.pathname,
      sourceImageUrl,
      url: uploaded.url,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to upload cover image.",
      500,
    );
  }
}
