const baseUrl = process.env.CONTENT_AUTOMATION_RUN_URL?.trim();
const internalKey = process.env.CONTENT_AUTOMATION_INTERNAL_KEY?.trim();
const memberEmail =
  process.env.CONTENT_AUTOMATION_DEFAULT_MEMBER_EMAIL?.trim() ??
  "genie1647@gmail.com";

if (!baseUrl) {
  console.error("CONTENT_AUTOMATION_RUN_URL is required.");
  process.exit(1);
}

if (!internalKey) {
  console.error("CONTENT_AUTOMATION_INTERNAL_KEY is required.");
  process.exit(1);
}

const response = await fetch(baseUrl, {
  body: JSON.stringify({
    memberEmail,
    mode: "discover_and_draft",
  }),
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

console.log(JSON.stringify(payload, null, 2));
