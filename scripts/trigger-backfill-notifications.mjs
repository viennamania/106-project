import { runBackfillNotificationsRequest } from "./lib/backfill-notifications-request.mjs";

const result = await runBackfillNotificationsRequest();
console.log(JSON.stringify(result, null, 2));
