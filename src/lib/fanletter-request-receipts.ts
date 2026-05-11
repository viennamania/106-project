const FANLETTER_REQUEST_RECEIPTS_KEY = "fanletter:fan-request-receipts:v1";
const FANLETTER_REQUEST_RECEIPT_LIMIT = 30;

function normalizeRequestId(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (!/^[A-Za-z0-9-]{8,80}$/.test(normalized)) {
    return null;
  }

  return normalized;
}

function normalizeRequestIds(values: unknown) {
  if (!Array.isArray(values)) {
    return [];
  }

  return Array.from(
    new Set(values.map(normalizeRequestId).filter((value) => value !== null)),
  ).slice(0, FANLETTER_REQUEST_RECEIPT_LIMIT);
}

export function readFanletterRequestReceiptIds() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(FANLETTER_REQUEST_RECEIPTS_KEY);

    return normalizeRequestIds(raw ? JSON.parse(raw) : []);
  } catch {
    return [];
  }
}

export function rememberFanletterRequestReceiptId(requestId: string) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedRequestId = normalizeRequestId(requestId);

  if (!normalizedRequestId) {
    return;
  }

  const nextRequestIds = [
    normalizedRequestId,
    ...readFanletterRequestReceiptIds().filter((id) => id !== normalizedRequestId),
  ].slice(0, FANLETTER_REQUEST_RECEIPT_LIMIT);

  try {
    window.localStorage.setItem(
      FANLETTER_REQUEST_RECEIPTS_KEY,
      JSON.stringify(nextRequestIds),
    );
  } catch {
    // Local receipt tracking is a convenience layer; request creation still succeeds.
  }
}
