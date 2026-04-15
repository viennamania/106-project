export type BithumbTickerRecord = {
  asOf: string;
  change24hKrw: number;
  changeRate24h: number;
  high24hKrw: number;
  low24hKrw: number;
  market: string;
  priceKrw: number;
  priceKrwRaw: string;
  source: "bithumb";
};

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

function parseNumber(value: string | undefined, fallback = 0) {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseAsOf(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "", 10);

  if (Number.isFinite(parsed)) {
    return new Date(parsed).toISOString();
  }

  return new Date().toISOString();
}

export async function fetchBithumbTicker(market: string) {
  const response = await fetch(`https://api.bithumb.com/public/ticker/${market}`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Bithumb ${market} ticker.`);
  }

  const payload = (await response.json()) as BithumbTickerResponse;

  if (payload.status !== "0000" || !payload.data?.closing_price) {
    throw new Error(payload.message || `Bithumb ${market} ticker payload was invalid.`);
  }

  return {
    asOf: parseAsOf(payload.data.date),
    change24hKrw: parseNumber(payload.data.fluctate_24H),
    changeRate24h: parseNumber(payload.data.fluctate_rate_24H),
    high24hKrw: parseNumber(payload.data.max_price),
    low24hKrw: parseNumber(payload.data.min_price),
    market,
    priceKrw: parseNumber(payload.data.closing_price),
    priceKrwRaw: payload.data.closing_price,
    source: "bithumb" as const,
  } satisfies BithumbTickerRecord;
}
