import { put } from "@vercel/blob";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * One-shot seeder: hosts a few clean sample garments on our Blob store so the
 * studio can offer a "try with a sample" tap (a first-timer can generate without
 * having their own product photo). Bearer-protected; call once, then hardcode
 * the returned URLs. Idempotent-ish (addRandomSuffix creates fresh URLs).
 */
const SAMPLE_SOURCES = [
  { name: "blush-top", url: "https://placehold.co/640x800/f6a5b8/ffffff/png" },
  { name: "navy-dress", url: "https://placehold.co/640x800/2b3a55/ffffff/png" },
  { name: "olive-knit", url: "https://placehold.co/640x800/7d8a5c/ffffff/png" },
];

export async function GET(request: Request) {
  const token = process.env.SELLER_JOB_WORKER_TOKEN;

  if (!token) {
    return Response.json({ error: "Not configured." }, { status: 404 });
  }

  if (request.headers.get("authorization") !== `Bearer ${token}`) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    return Response.json(
      { error: "BLOB_READ_WRITE_TOKEN is not configured." },
      { status: 500 },
    );
  }

  const samples: { name: string; url?: string; error?: string }[] = [];

  for (const source of SAMPLE_SOURCES) {
    try {
      const response = await fetch(source.url, {
        headers: { "user-agent": "Mozilla/5.0" },
      });

      if (!response.ok) {
        samples.push({ error: `fetch ${response.status}`, name: source.name });
        continue;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const uploaded = await put(`lookbook-samples/${source.name}.png`, buffer, {
        access: "public",
        addRandomSuffix: true,
        contentType: "image/png",
      });
      samples.push({ name: source.name, url: uploaded.url });
    } catch (error) {
      samples.push({
        error: error instanceof Error ? error.message : "failed",
        name: source.name,
      });
    }
  }

  return Response.json({ samples });
}
