import { put } from "@vercel/blob";

import { authorizeSellerWorkspace } from "@/lib/seller-workspace";

export const runtime = "nodejs";

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 8 * 1024 * 1024;

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

  return normalized || "seller-upload";
}

function resolveExtension(file: File) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".png") || file.type === "image/png") return ".png";
  if (name.endsWith(".webp") || file.type === "image/webp") return ".webp";
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

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const workspaceKey = String(formData.get("workspaceKey") ?? "");
  const file = formData.get("file");

  const workspace = await authorizeSellerWorkspace({ workspaceId, workspaceKey });

  if (!workspace) {
    return jsonError("Workspace not found or unauthorized.", 401);
  }

  if (!(file instanceof File)) {
    return jsonError("file is required.", 400);
  }

  if (!allowedImageTypes.has(file.type)) {
    return jsonError("Only PNG, JPG, and WEBP images are supported.", 400);
  }

  if (file.size > MAX_BYTES) {
    return jsonError("Image must be 8MB or smaller.", 400);
  }

  const pathname = [
    "seller-lookbook",
    workspace.workspaceId,
    "uploads",
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
