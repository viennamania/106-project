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
  const email =
    typeof overrides.email === "string"
      ? overrides.email.trim()
      : process.env.PAID_VIDEO_COVERS_BACKFILL_EMAIL?.trim() ??
        process.env.RECONCILE_EMAIL?.trim();
  const contentId =
    typeof overrides.contentId === "string"
      ? overrides.contentId.trim()
      : process.env.PAID_VIDEO_COVERS_BACKFILL_CONTENT_ID?.trim();
  const style =
    typeof overrides.style === "string"
      ? overrides.style.trim()
      : process.env.PAID_VIDEO_COVERS_BACKFILL_STYLE?.trim();
  const rawLimit =
    typeof overrides.limit === "number"
      ? String(overrides.limit)
      : process.env.PAID_VIDEO_COVERS_BACKFILL_LIMIT?.trim() ??
        process.env.RECONCILE_LIMIT?.trim();
  const write = parseBoolean(
    overrides.write ?? process.env.PAID_VIDEO_COVERS_BACKFILL_WRITE,
  );
  const includeDrafts = parseBoolean(
    overrides.includeDrafts ??
      process.env.PAID_VIDEO_COVERS_BACKFILL_INCLUDE_DRAFTS,
  );
  const includeGeneratedVideos = parseBoolean(
    overrides.includeGeneratedVideos ??
      process.env.PAID_VIDEO_COVERS_BACKFILL_INCLUDE_GENERATED_VIDEOS,
  );

  if (email) {
    payload.email = email;
  }

  if (contentId) {
    payload.contentId = contentId;
  }

  if (style) {
    payload.style = style;
  }

  if (rawLimit) {
    const limit = Number(rawLimit);

    if (Number.isFinite(limit)) {
      payload.limit = limit;
    }
  }

  if (write !== undefined) {
    payload.write = write;
  }

  if (includeDrafts !== undefined) {
    payload.includeDrafts = includeDrafts;
  }

  if (includeGeneratedVideos !== undefined) {
    payload.includeGeneratedVideos = includeGeneratedVideos;
  }

  return payload;
}

export async function runBackfillPaidVideoCoversRequest(overrides) {
  const baseUrl = normalizeBaseUrl(
    process.env.RECONCILE_BASE_URL?.trim() ??
      process.env.BACKEND_BASE_URL?.trim() ??
      process.env.RAILWAY_PUBLIC_DOMAIN?.trim() ??
      "",
  );
  const token = getRequiredToken();
  const response = await fetch(
    new URL("/api/internal/backfill-paid-video-covers", baseUrl),
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
      `Paid video cover backfill request failed (${response.status}): ${
        typeof data?.error === "string" ? data.error : text
      }`,
    );
  }

  return data;
}
