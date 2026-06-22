import net from "node:net";
import { lookup } from "node:dns/promises";

import { put } from "@vercel/blob";

import { authorizeSellerWorkspace } from "@/lib/seller-workspace";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15000;
const MAX_REDIRECTS = 3;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

// Reject private / loopback / link-local / reserved ranges so this importer
// can't be used to reach internal services or cloud metadata (SSRF).
function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const p = ip.split(".").map(Number);
    if (p[0] === 0 || p[0] === 10 || p[0] === 127) return true;
    if (p[0] === 169 && p[1] === 254) return true; // link-local + metadata
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
    if (p[0] === 192 && p[1] === 168) return true;
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true; // CGNAT
    return false;
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === "::1" || lower === "::") return true;
    if (lower.startsWith("fe80")) return true; // link-local
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // ULA
    const mapped = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]);
    return false;
  }
  return true; // unknown → reject
}

async function assertPublicHost(url: URL): Promise<void> {
  if (url.protocol !== "https:") {
    throw new Error("ONLY_HTTPS");
  }
  const addresses = await lookup(url.hostname, { all: true });
  if (addresses.length === 0) {
    throw new Error("DNS_FAIL");
  }
  for (const address of addresses) {
    if (isPrivateIp(address.address)) {
      throw new Error("PRIVATE_IP");
    }
  }
}

// Follow up to MAX_REDIRECTS hops, re-validating each host's IP, so a redirect
// can't bounce us onto an internal address.
async function safeFetchImage(
  rawUrl: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  let current: URL;
  try {
    current = new URL(rawUrl);
  } catch {
    throw new Error("INVALID_URL");
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    await assertPublicHost(current);

    const response = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("BAD_REDIRECT");
      current = new URL(location, current);
      continue;
    }

    if (!response.ok) {
      throw new Error("FETCH_FAILED");
    }

    const contentType = (response.headers.get("content-type") ?? "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    if (!ALLOWED_TYPES.has(contentType)) {
      throw new Error("NOT_IMAGE");
    }

    const declared = Number(response.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > MAX_BYTES) {
      throw new Error("TOO_LARGE");
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_BYTES) {
      throw new Error("TOO_LARGE");
    }

    return { buffer: Buffer.from(arrayBuffer), contentType };
  }

  throw new Error("TOO_MANY_REDIRECTS");
}

function extensionFor(contentType: string) {
  if (contentType === "image/png") return ".png";
  if (contentType === "image/webp") return ".webp";
  return ".jpg";
}

const ERROR_MESSAGES: Record<string, string> = {
  BAD_REDIRECT: "이미지 주소가 올바르지 않습니다.",
  DNS_FAIL: "이미지 주소를 찾을 수 없습니다.",
  FETCH_FAILED: "이미지를 가져오지 못했습니다.",
  INVALID_URL: "올바른 이미지 주소가 아닙니다.",
  NOT_IMAGE: "이미지 파일(JPG/PNG/WEBP) 주소만 가져올 수 있습니다.",
  ONLY_HTTPS: "https 이미지 주소만 가져올 수 있습니다.",
  PRIVATE_IP: "허용되지 않은 주소입니다.",
  TOO_LARGE: "이미지가 8MB를 초과합니다.",
  TOO_MANY_REDIRECTS: "이미지를 가져오지 못했습니다.",
};

// Import an external image URL into our Blob store (SSRF-guarded server fetch),
// so pasted product URLs become first-class uploads that preview and generate.
export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    return jsonError("BLOB_READ_WRITE_TOKEN is not configured.", 500);
  }

  let body: { workspaceId?: string | null; workspaceKey?: string | null; url?: string | null } | null =
    null;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const workspace = await authorizeSellerWorkspace({
    workspaceId: body?.workspaceId,
    workspaceKey: body?.workspaceKey,
  });
  if (!workspace) {
    return jsonError("Workspace not found or unauthorized.", 401);
  }

  const url = body?.url?.trim() ?? "";
  if (!url) {
    return jsonError("url is required.", 400);
  }

  let image: { buffer: Buffer; contentType: string };
  try {
    image = await safeFetchImage(url);
  } catch (error) {
    const code = error instanceof Error ? error.message : "FETCH_FAILED";
    return jsonError(ERROR_MESSAGES[code] ?? "이미지를 가져오지 못했습니다.", 400);
  }

  const pathname = [
    "seller-lookbook",
    workspace.workspaceId,
    "imports",
    `${Date.now()}-import${extensionFor(image.contentType)}`,
  ].join("/");

  try {
    const uploaded = await put(pathname, image.buffer, {
      access: "public",
      addRandomSuffix: true,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
      contentType: image.contentType,
    });

    return Response.json({
      contentType: uploaded.contentType,
      pathname: uploaded.pathname,
      url: uploaded.url,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to store image.",
      500,
    );
  }
}
