import { runReconcileRequest } from "./lib/reconcile-signups-request.mjs";
import { runCompletedMembersReconcileRequest } from "./lib/reconcile-completed-members-request.mjs";

const intervalMs = Math.max(
  5_000,
  Number(process.env.RECONCILE_INTERVAL_MS ?? 30_000),
);
let running = false;

function readOptionalStringEnv(...keys) {
  for (const key of keys) {
    const value = process.env[key]?.trim();

    if (value) {
      return value;
    }
  }

  return undefined;
}

function readOptionalNumberEnv(...keys) {
  for (const key of keys) {
    const value = process.env[key]?.trim();

    if (!value) {
      continue;
    }

    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

async function tick() {
  if (running) {
    return;
  }

  running = true;

  try {
    const pendingOptions = {
      email: readOptionalStringEnv("RECONCILE_PENDING_EMAIL", "RECONCILE_EMAIL"),
      limit: readOptionalNumberEnv("RECONCILE_PENDING_LIMIT", "RECONCILE_LIMIT"),
    };
    const completedOptions = {
      email: readOptionalStringEnv(
        "RECONCILE_COMPLETED_EMAIL",
        "RECONCILE_EMAIL",
      ),
      limit: readOptionalNumberEnv(
        "RECONCILE_COMPLETED_LIMIT",
        "RECONCILE_LIMIT",
      ),
    };
    const pendingResult = await runReconcileRequest(pendingOptions);
    const completedResult = await runCompletedMembersReconcileRequest(
      completedOptions,
    );

    console.log(
      JSON.stringify(
        {
          completedNetworks: {
            checked: completedResult.checked,
            limit: completedResult.limit,
            ranAt: completedResult.ranAt,
            reconciled: completedResult.reconciled,
          },
          pendingSignups: {
            checked: pendingResult.checked,
            completed: pendingResult.completed,
            limit: pendingResult.limit,
            ranAt: pendingResult.ranAt,
            stillPending: pendingResult.stillPending,
          },
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
