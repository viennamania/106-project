// Railway worker: drains the seller lookbook job queue.
//
// It repeatedly calls the deployed internal process route, which claims one
// queued job and runs the heavy generation (lookbook image sets / video) off
// the user-facing Vercel request. Runs as a continuous service (not cron) so
// queued jobs are picked up with low latency.
//
// Env:
//   LOOKBOOK_PROCESS_URL          full URL of POST /api/internal/seller-lookbook/process
//                                 (prefer the Railway API internal URL in prod,
//                                  e.g. http://api.railway.internal:8080/api/internal/seller-lookbook/process)
//   SELLER_JOB_WORKER_TOKEN       bearer token matching the route
//   LOOKBOOK_WORKER_INTERVAL_MS   idle poll interval when the queue is empty (default 5000)

const url = process.env.LOOKBOOK_PROCESS_URL?.trim();
const token = process.env.SELLER_JOB_WORKER_TOKEN?.trim();
const idleMs = Math.max(
  2000,
  Number(process.env.LOOKBOOK_WORKER_INTERVAL_MS ?? 5000),
);

if (!url) {
  console.error("LOOKBOOK_PROCESS_URL is required.");
  process.exit(1);
}
if (!token) {
  console.error("SELLER_JOB_WORKER_TOKEN is required.");
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function tick() {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    method: "POST",
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    console.error(JSON.stringify({ status: response.status, payload }));
    return 0;
  }

  if (payload?.processed) {
    console.log(JSON.stringify(payload));
  }

  return payload?.processed ?? 0;
}

console.log("lookbook worker started", { idleMs, url });

for (;;) {
  let processed = 0;
  try {
    processed = await tick();
  } catch (error) {
    console.error("tick error", error?.message ?? error);
  }
  // Drain back-to-back while there is work; otherwise idle for the interval.
  if (!processed) {
    await sleep(idleMs);
  }
}
