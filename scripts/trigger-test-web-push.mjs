import { runTestWebPushRequest } from "./lib/test-web-push-request.mjs";

const result = await runTestWebPushRequest();
console.log(JSON.stringify(result, null, 2));
