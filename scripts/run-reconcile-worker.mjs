import { runReconcileRequest } from "./lib/reconcile-signups-request.mjs";

const intervalMs = Math.max(
  5_000,
  Number(process.env.RECONCILE_INTERVAL_MS ?? 30_000),
);
let running = false;

async function tick() {
  if (running) {
    return;
  }

  running = true;

  try {
    const result = await runReconcileRequest();
    console.log(
      JSON.stringify(
        {
          checked: result.checked,
          completed: result.completed,
          ranAt: result.ranAt,
          stillPending: result.stillPending,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error("[reconcile-worker]", error);
  } finally {
    running = false;
  }
}

await tick();
setInterval(() => {
  void tick();
}, intervalMs);
