/**
 * Coinbase Exchange public API (no API keys required for market data).
 * https://api.exchange.coinbase.com
 */

export const COINBASE_EXCHANGE_BASE =
  process.env.COINBASE_API_BASE?.replace(/\/$/, "") ||
  "https://api.exchange.coinbase.com";

export const COINBASE_SPOT_BASE =
  process.env.COINBASE_SPOT_BASE?.replace(/\/$/, "") ||
  "https://api.coinbase.com";

export interface CoinbaseTicker {
  symbol: string;
  price: number;
  bid: number | null;
  ask: number | null;
  volume: number | null;
  time: string | null;
  source: "exchange" | "spot";
}

export interface CoinbaseConnectionStatus {
  ok: boolean;
  connected: boolean;
  service: "coinbase";
  message: string;
  checkedAt: string;
  latencyMs: number;
  products: CoinbaseTicker[];
  error?: string;
}

async function fetchJson(url: string, timeoutMs = 8_000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from ${url}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Fetch a product ticker from Coinbase Exchange. */
export async function fetchExchangeTicker(
  productId: string
): Promise<CoinbaseTicker> {
  const raw = (await fetchJson(
    `${COINBASE_EXCHANGE_BASE}/products/${encodeURIComponent(productId)}/ticker`
  )) as Record<string, unknown>;

  const price = toNumber(raw.price);
  if (price == null || price <= 0) {
    throw new Error(`Invalid ticker price for ${productId}`);
  }

  return {
    symbol: productId.toUpperCase(),
    price,
    bid: toNumber(raw.bid),
    ask: toNumber(raw.ask),
    volume: toNumber(raw.volume),
    time: typeof raw.time === "string" ? raw.time : null,
    source: "exchange",
  };
}

/** Fallback spot price from Coinbase retail API. */
export async function fetchSpotPrice(
  productId: string
): Promise<CoinbaseTicker> {
  const [base, quote] = productId.split("-");
  if (!base || !quote) throw new Error(`Bad product id: ${productId}`);

  const raw = (await fetchJson(
    `${COINBASE_SPOT_BASE}/v2/prices/${encodeURIComponent(base)}-${encodeURIComponent(quote)}/spot`
  )) as { data?: { amount?: string } };

  const price = toNumber(raw.data?.amount);
  if (price == null || price <= 0) {
    throw new Error(`Invalid spot price for ${productId}`);
  }

  return {
    symbol: productId.toUpperCase(),
    price,
    bid: null,
    ask: null,
    volume: null,
    time: new Date().toISOString(),
    source: "spot",
  };
}

export async function fetchCoinbaseTicker(
  productId: string
): Promise<CoinbaseTicker> {
  try {
    return await fetchExchangeTicker(productId);
  } catch {
    return await fetchSpotPrice(productId);
  }
}

const DEFAULT_PRODUCTS = ["XRP-USD", "ETH-USD", "BTC-USD", "SOL-USD"];

export interface CoinbaseCandle {
  time: number;
  low: number;
  high: number;
  open: number;
  close: number;
  volume: number;
}

export interface DepthLevel {
  price: number;
  size: number;
  numOrders: number;
}

export interface CoinbaseOrderBook {
  symbol: string;
  bids: DepthLevel[];
  asks: DepthLevel[];
  time: string | null;
  mid: number | null;
  spread: number | null;
}

/** Historic candles: [time, low, high, open, close, volume] */
export async function fetchCoinbaseCandles(
  productId: string,
  granularitySec = 3600,
  limit = 48
): Promise<CoinbaseCandle[]> {
  const raw = (await fetchJson(
    `${COINBASE_EXCHANGE_BASE}/products/${encodeURIComponent(productId)}/candles?granularity=${granularitySec}`
  )) as unknown[];

  if (!Array.isArray(raw)) throw new Error("Invalid candles response");

  const candles: CoinbaseCandle[] = [];
  for (const row of raw) {
    if (!Array.isArray(row) || row.length < 6) continue;
    const time = toNumber(row[0]);
    const low = toNumber(row[1]);
    const high = toNumber(row[2]);
    const open = toNumber(row[3]);
    const close = toNumber(row[4]);
    const volume = toNumber(row[5]);
    if (
      time == null ||
      low == null ||
      high == null ||
      open == null ||
      close == null ||
      volume == null
    ) {
      continue;
    }
    candles.push({ time, low, high, open, close, volume });
  }

  return candles
    .sort((a, b) => a.time - b.time)
    .slice(-Math.max(2, limit));
}

/** Level-2 aggregated order book for depth chart. */
export async function fetchCoinbaseOrderBook(
  productId: string,
  levels = 20
): Promise<CoinbaseOrderBook> {
  const raw = (await fetchJson(
    `${COINBASE_EXCHANGE_BASE}/products/${encodeURIComponent(productId)}/book?level=2`
  )) as {
    bids?: unknown[];
    asks?: unknown[];
    time?: string;
  };

  const parseSide = (rows: unknown[] | undefined): DepthLevel[] => {
    if (!Array.isArray(rows)) return [];
    const out: DepthLevel[] = [];
    for (const row of rows) {
      if (!Array.isArray(row) || row.length < 2) continue;
      const price = toNumber(row[0]);
      const size = toNumber(row[1]);
      const numOrders = toNumber(row[2]) ?? 0;
      if (price == null || size == null || price <= 0 || size <= 0) continue;
      out.push({ price, size, numOrders });
      if (out.length >= levels) break;
    }
    return out;
  };

  const bids = parseSide(raw.bids);
  const asks = parseSide(raw.asks);
  const bestBid = bids[0]?.price ?? null;
  const bestAsk = asks[0]?.price ?? null;
  const mid =
    bestBid != null && bestAsk != null ? (bestBid + bestAsk) / 2 : null;
  const spread =
    bestBid != null && bestAsk != null ? bestAsk - bestBid : null;

  return {
    symbol: productId.toUpperCase(),
    bids,
    asks,
    time: typeof raw.time === "string" ? raw.time : null,
    mid,
    spread,
  };
}

/** End-to-end connectivity check used by /api/coinbase and Validate-IAM. */
export async function checkCoinbaseConnection(
  products: string[] = DEFAULT_PRODUCTS
): Promise<CoinbaseConnectionStatus> {
  const checkedAt = new Date().toISOString();
  const started = Date.now();
  const tickers: CoinbaseTicker[] = [];
  const errors: string[] = [];

  for (const product of products) {
    try {
      tickers.push(await fetchCoinbaseTicker(product));
    } catch (err) {
      errors.push(
        `${product}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  const latencyMs = Date.now() - started;
  const connected = tickers.length > 0;

  return {
    ok: connected,
    connected,
    service: "coinbase",
    message: connected
      ? `Connected to Coinbase — ${tickers.length} product(s)`
      : "Could not reach Coinbase APIs",
    checkedAt,
    latencyMs,
    products: tickers,
    ...(errors.length ? { error: errors.join("; ") } : {}),
  };
}
