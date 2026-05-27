function normalizeBaseUrl(input) {
  if (!input) {
    throw new Error("RECONCILE_BASE_URL or BACKEND_BASE_URL is required.");
  }

  return input.startsWith("http://") || input.startsWith("https://")
    ? input
    : `https://${input}`;
}

function getRequiredToken() {
  const token =
    process.env.RECONCILE_API_TOKEN?.trim() ??
    process.env.RAILWAY_RECONCILE_TOKEN?.trim() ??
    "";

  if (!token) {
    throw new Error(
      "RECONCILE_API_TOKEN or RAILWAY_RECONCILE_TOKEN is required.",
    );
  }

  return token;
}

function parseBoolean(value) {
  if (value === true || value === "true" || value === "1") {
    return true;
  }

  if (value === false || value === "false" || value === "0") {
    return false;
  }

  return undefined;
}

function normalizeRequestPayload(overrides = {}) {
  const payload = {};
  const contentId =
    typeof overrides.contentId === "string"
      ? overrides.contentId.trim()
      : process.env.CONTENT_VIDEO_METADATA_BACKFILL_CONTENT_ID?.trim();
  const email =
    typeof overrides.email === "string"
      ? overrides.email.trim()
      : process.env.CONTENT_VIDEO_METADATA_BACKFILL_EMAIL?.trim() ??
        process.env.RECONCILE_EMAIL?.trim();
  const rawLimit =
    typeof overrides.limit === "number"
      ? String(overrides.limit)
      : process.env.CONTENT_VIDEO_METADATA_BACKFILL_LIMIT?.trim() ??
        process.env.RECONCILE_LIMIT?.trim();
  const force = parseBoolean(
    overrides.force ?? process.env.CONTENT_VIDEO_METADATA_BACKFILL_FORCE,
  );
  const write = parseBoolean(
    overrides.write ?? process.env.CONTENT_VIDEO_METADATA_BACKFILL_WRITE,
  );

  if (contentId) {
    payload.contentId = contentId;
  }

  if (email) {
    payload.email = email;
  }

  if (rawLimit) {
    const limit = Number(rawLimit);

    if (Number.isFinite(limit)) {
      payload.limit = limit;
    }
  }

  if (force !== undefined) {
    payload.force = force;
  }

  if (write !== undefined) {
    payload.write = write;
  }

  return payload;
}

export async function runBackfillContentVideoMetadataRequest(overrides) {
  const baseUrl = normalizeBaseUrl(
    process.env.RECONCILE_BASE_URL?.trim() ??
      process.env.BACKEND_BASE_URL?.trim() ??
      process.env.RAILWAY_PUBLIC_DOMAIN?.trim() ??
      "",
  );
  const token = getRequiredToken();
  const response = await fetch(
    new URL("/api/internal/backfill-content-video-metadata", baseUrl),
    {
      body: JSON.stringify(normalizeRequestPayload(overrides)),
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      method: "POST",
    },
  );
  const text = await response.text();
  let data = null;

  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new Error(
      `Content video metadata backfill request failed (${response.status}): ${
        typeof data?.error === "string" ? data.error : text
      }`,
    );
  }

  return data;
}
