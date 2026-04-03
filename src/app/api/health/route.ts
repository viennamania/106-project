import { getMembersCollection } from "@/lib/mongodb";

export const runtime = "nodejs";
export const maxDuration = 10;

function getMissingHealthEnv() {
  return [
    "MONGODB_URI",
    "MONGODB_DB_NAME",
    "PROJECT_WALLET",
    "THIRDWEB_WEBHOOK_SECRETS",
  ].filter((key) => !process.env[key]?.trim());
}

export async function GET() {
  const missing = getMissingHealthEnv();

  if (missing.length > 0) {
    return Response.json(
      {
        missing,
        ok: false,
      },
      { status: 500 },
    );
  }

  try {
    await getMembersCollection();

    return Response.json({
      commit:
        process.env.RAILWAY_GIT_COMMIT_SHA?.trim() ??
        process.env.VERCEL_GIT_COMMIT_SHA?.trim() ??
        null,
      ok: true,
      service: "106-project-api",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Mongo connection failed.",
        ok: false,
      },
      { status: 500 },
    );
  }
}
