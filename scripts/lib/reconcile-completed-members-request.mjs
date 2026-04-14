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

function normalizeRequestPayload(overrides = {}) {
  const payload = {};
  const email =
    typeof overrides.email === "string"
      ? overrides.email.trim()
      : process.env.RECONCILE_COMPLETED_EMAIL?.trim() ??
        process.env.RECONCILE_EMAIL?.trim();
  const rawLimit =
    typeof overrides.limit === "number"
      ? String(overrides.limit)
      : process.env.RECONCILE_COMPLETED_LIMIT?.trim() ??
        process.env.RECONCILE_LIMIT?.trim();

  if (email) {
    payload.email = email;
  }

  if (rawLimit) {
    const limit = Number(rawLimit);

    if (Number.isFinite(limit)) {
      payload.limit = limit;
    }
  }

  return payload;
}

export async function runCompletedMembersReconcileRequest(overrides) {
  const baseUrl = normalizeBaseUrl(
    process.env.RECONCILE_BASE_URL?.trim() ??
      process.env.BACKEND_BASE_URL?.trim() ??
      process.env.RAILWAY_PUBLIC_DOMAIN?.trim() ??
      "",
  );
  const token = getRequiredToken();
  const response = await fetch(
    new URL("/api/internal/reconcile-completed-members", baseUrl),
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
      `Completed-network reconcile request failed (${response.status}): ${
        typeof data?.error === "string" ? data.error : text
      }`,
    );
  }

  return data;
}
