import { runReconcileRequest } from "./lib/reconcile-signups-request.mjs";

const result = await runReconcileRequest();
console.log(JSON.stringify(result, null, 2));
