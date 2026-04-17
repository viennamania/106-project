import { put } from "@vercel/blob";

import { BRANDING_IMAGE_MAX_BYTES } from "@/lib/landing-branding";
import { getMembersCollection } from "@/lib/mongodb";
import { normalizeEmail } from "@/lib/member";

export const runtime = "nodejs";

const allowedImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function sanitizeBaseName(name: string) {
  const baseName = name.replace(/\.[^.]+$/, "");
  const normalized = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  return normalized || "hero-image";
}

function resolveExtension(file: File) {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith(".png")) {
    return ".png";
  }

  if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) {
    return fileName.endsWith(".jpeg") ? ".jpeg" : ".jpg";
  }

  if (fileName.endsWith(".webp")) {
    return ".webp";
  }

  if (file.type === "image/png") {
    return ".png";
  }

  if (file.type === "image/webp") {
    return ".webp";
  }

  return ".jpg";
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

  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const file = formData.get("file");

  if (!email) {
    return jsonError("email is required.", 400);
  }

  if (!(file instanceof File)) {
    return jsonError("file is required.", 400);
  }

  if (!allowedImageTypes.has(file.type)) {
    return jsonError("Only PNG, JPG, and WEBP images are supported.", 400);
  }

  if (file.size > BRANDING_IMAGE_MAX_BYTES) {
    return jsonError("Image must be 4MB or smaller.", 400);
  }

  const collection = await getMembersCollection();
  const member = await collection.findOne({ email });

  if (!member) {
    return jsonError("Member not found.", 404);
  }

  if (member.status !== "completed" || !member.referralCode) {
    return jsonError("Branding Studio is only available to completed members.", 403);
  }

  const pathname = [
    "landing-branding",
    member.referralCode,
    `${Date.now()}-${sanitizeBaseName(file.name)}${resolveExtension(file)}`,
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
      url: uploaded.url,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to upload image.",
      500,
    );
  }
}
