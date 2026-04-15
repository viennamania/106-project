export const dynamic = "force-dynamic";

type BithumbTickerResponse = {
  data?: {
    closing_price?: string;
    date?: string;
    fluctate_24H?: string;
    fluctate_rate_24H?: string;
    max_price?: string;
    min_price?: string;
  };
  message?: string;
  status?: string;
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function parseNumber(value: string | undefined, fallback = 0) {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function GET() {
  try {
    const response = await fetch("https://api.bithumb.com/public/ticker/BNB_KRW", {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return jsonError("Failed to fetch Bithumb ticker.", 502);
    }

    const payload = (await response.json()) as BithumbTickerResponse;

    if (payload.status !== "0000" || !payload.data) {
      return jsonError(
        payload.message || "Bithumb ticker payload was invalid.",
        502,
      );
    }

    const asOf =
      payload.data.date && Number.isFinite(Number.parseInt(payload.data.date, 10))
        ? new Date(Number.parseInt(payload.data.date, 10)).toISOString()
        : new Date().toISOString();

    return Response.json({
      asOf,
      change24hKrw: parseNumber(payload.data.fluctate_24H),
      changeRate24h: parseNumber(payload.data.fluctate_rate_24H),
      high24hKrw: parseNumber(payload.data.max_price),
      low24hKrw: parseNumber(payload.data.min_price),
      market: "BNB_KRW",
      priceKrw: parseNumber(payload.data.closing_price),
      source: "bithumb",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch the Bithumb BNB/KRW ticker.";

    return jsonError(message, 502);
  }
}
