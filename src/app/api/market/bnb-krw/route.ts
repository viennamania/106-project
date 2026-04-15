import { fetchBithumbTicker } from "@/lib/bithumb-market";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function GET() {
  try {
    const ticker = await fetchBithumbTicker("BNB_KRW");

    return Response.json({
      asOf: ticker.asOf,
      change24hKrw: ticker.change24hKrw,
      changeRate24h: ticker.changeRate24h,
      high24hKrw: ticker.high24hKrw,
      low24hKrw: ticker.low24hKrw,
      market: ticker.market,
      priceKrw: ticker.priceKrw,
      source: ticker.source,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch the Bithumb BNB/KRW ticker.";

    return jsonError(message, 502);
  }
}
