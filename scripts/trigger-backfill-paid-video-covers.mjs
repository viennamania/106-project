import process from "node:process";

import { loadLocalEnv } from "./lib/load-local-env.mjs";
import { runBackfillPaidVideoCoversRequest } from "./lib/backfill-paid-video-covers-request.mjs";

loadLocalEnv();

const args = process.argv.slice(2);

function readArgValue(name) {
  const prefixed = `${name}=`;
  const inlineArg = args.find((arg) => arg.startsWith(prefixed));

  if (inlineArg) {
    return inlineArg.slice(prefixed.length);
  }

  const index = args.indexOf(name);

  if (index >= 0) {
    return args[index + 1];
  }

  return undefined;
}

function readPositiveInteger(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return Math.floor(parsed);
}

const result = await runBackfillPaidVideoCoversRequest({
  allowAiFallback: !args.includes("--no-ai-fallback"),
  coverMode: readArgValue("--cover-mode"),
  contentId: readArgValue("--content-id"),
  email: readArgValue("--email"),
  includeDrafts: args.includes("--include-drafts"),
  includeGeneratedVideos: args.includes("--include-generated-videos"),
  limit: readPositiveInteger(readArgValue("--limit")),
  replaceExistingCovers: args.includes("--replace-existing-covers"),
  style: readArgValue("--style"),
  write: args.includes("--write"),
});

console.log(JSON.stringify(result, null, 2));
