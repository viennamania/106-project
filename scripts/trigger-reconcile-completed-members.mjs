import { runCompletedMembersReconcileRequest } from "./lib/reconcile-completed-members-request.mjs";

const result = await runCompletedMembersReconcileRequest();
console.log(JSON.stringify(result, null, 2));
