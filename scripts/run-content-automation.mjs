const baseUrl = process.env.CONTENT_AUTOMATION_RUN_URL?.trim();
const internalKey = process.env.CONTENT_AUTOMATION_INTERNAL_KEY?.trim();
const targetMemberEmail =
  process.env.CONTENT_AUTOMATION_TARGET_MEMBER_EMAIL?.trim() ?? "";

if (!baseUrl) {
  console.error("CONTENT_AUTOMATION_RUN_URL is required.");
  process.exit(1);
}

if (!internalKey) {
  console.error("CONTENT_AUTOMATION_INTERNAL_KEY is required.");
  process.exit(1);
}

const response = await fetch(baseUrl, {
  body: JSON.stringify(
    targetMemberEmail
      ? {
          memberEmail: targetMemberEmail,
          mode: "discover_and_draft",
        }
      : {
          mode: "discover_and_draft",
        },
  ),
  headers: {
    "Content-Type": "application/json",
    "x-automation-key": internalKey,
  },
  method: "POST",
});

const payload = await response.json().catch(() => null);

if (!response.ok) {
  console.error(
    JSON.stringify(
      {
        payload,
        status: response.status,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

if (
  payload &&
  typeof payload === "object" &&
  "summary" in payload &&
  payload.summary &&
  typeof payload.summary === "object"
) {
  const summary = payload.summary;
  const failed =
    "failed" in summary && typeof summary.failed === "number"
      ? summary.failed
      : 0;

  if (failed > 0) {
    console.warn(
      JSON.stringify(
        {
          message: "Content automation completed with handled failures.",
          summary,
        },
        null,
        2,
      ),
    );
  }
}

console.log(JSON.stringify(payload, null, 2));
