import { getSellerJobStats } from "@/lib/seller-jobs";

export const runtime = "nodejs";

// Queue health for an external uptime monitor. Bearer-protected with the same
// worker token. Alert when oldestQueuedAgeSec is high while processing is 0
// (the worker is not draining the queue).
export async function GET(request: Request) {
  const token = process.env.SELLER_JOB_WORKER_TOKEN?.trim();

  if (!token) {
    return Response.json(
      { error: "SELLER_JOB_WORKER_TOKEN is not configured." },
      { status: 500 },
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${token}`) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const stats = await getSellerJobStats();

  return Response.json({ now: new Date().toISOString(), ok: true, stats });
}
