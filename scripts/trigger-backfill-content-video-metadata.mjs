import process from "node:process";

import { loadLocalEnv } from "./lib/load-local-env.mjs";
import { runBackfillContentVideoMetadataRequest } from "./lib/backfill-content-video-metadata-request.mjs";

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

const result = await runBackfillContentVideoMetadataRequest({
  contentId: readArgValue("--content-id"),
  email: readArgValue("--email"),
  force: args.includes("--force"),
  limit: readPositiveInteger(readArgValue("--limit")),
  write: args.includes("--write"),
});

console.log(JSON.stringify(result, null, 2));
