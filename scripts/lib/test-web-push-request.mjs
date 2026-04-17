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
  const email =
    typeof overrides.email === "string"
      ? overrides.email.trim()
      : process.env.TEST_WEB_PUSH_EMAIL?.trim() ??
        process.env.RECONCILE_EMAIL?.trim() ??
        "";

  if (!email) {
    throw new Error("TEST_WEB_PUSH_EMAIL or an email override is required.");
  }

  const payload = { email };
  const title =
    typeof overrides.title === "string"
      ? overrides.title.trim()
      : process.env.TEST_WEB_PUSH_TITLE?.trim() ?? "";
  const body =
    typeof overrides.body === "string"
      ? overrides.body.trim()
      : process.env.TEST_WEB_PUSH_BODY?.trim() ?? "";
  const href =
    typeof overrides.href === "string"
      ? overrides.href.trim()
      : process.env.TEST_WEB_PUSH_HREF?.trim() ?? "";

  if (title) {
    payload.title = title;
  }

  if (body) {
    payload.body = body;
  }

  if (href) {
    payload.href = href;
  }

  return payload;
}

export async function runTestWebPushRequest(overrides) {
  const baseUrl = normalizeBaseUrl(
    process.env.RECONCILE_BASE_URL?.trim() ??
      process.env.BACKEND_BASE_URL?.trim() ??
      process.env.RAILWAY_PUBLIC_DOMAIN?.trim() ??
      "",
  );
  const token = getRequiredToken();
  const response = await fetch(new URL("/api/internal/test-web-push", baseUrl), {
    body: JSON.stringify(normalizeRequestPayload(overrides)),
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    method: "POST",
  });
  const text = await response.text();
  let data = null;

  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new Error(
      `Test web push request failed (${response.status}): ${
        typeof data?.error === "string" ? data.error : text
      }`,
    );
  }

  return data;
}
