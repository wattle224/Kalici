import type { Candle, OrderBook, Quote } from "./types";
import { ACTIVE_MARKET } from "@/lib/symbols";

export interface MarketProvider {
  id: string;
  label: string;
  fetchQuotes(symbols: string[]): Promise<Quote[]>;
  fetchCandles(symbol: string, granularitySec?: number): Promise<Candle[]>;
  fetchOrderBook(symbol: string): Promise<OrderBook | null>;
  searchCoverageNote: string;
}

async function tryJson(urls: string[]): Promise<unknown | null> {
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      return await res.json();
    } catch {
      /* next */
    }
  }
  return null;
}

export const coinbaseLedgerProvider: MarketProvider = {
  id: "coinbase+ledger",
  label: "Coinbase Exchange (public) + IAM Ledger",
  searchCoverageNote:
    "Live candles/depth for Coinbase crypto products. Equities/FX/futures in the universe are simulated sample instruments until a licensed market-data vendor is connected.",
  async fetchQuotes(symbols) {
    const data = (await tryJson([
      `/api/coinbase?products=${encodeURIComponent(symbols.join(","))}`,
      `http://127.0.0.1:8000/api/coinbase?products=${encodeURIComponent(symbols.join(","))}`,
    ])) as {
      products?: { symbol: string; price: number; bid: number | null; ask: number | null; time: string | null; volume: number | null }[];
      connected?: boolean;
    } | null;

    if (!data?.products?.length) return [];
    return data.products.map((p) => {
      // Without prior close, treat small synthetic change as unknown → show 0 until extended
      return {
        symbol: p.symbol,
        last: p.price,
        bid: p.bid ?? undefined,
        ask: p.ask ?? undefined,
        change: 0,
        changePct: 0,
        volume: p.volume ?? undefined,
        timestamp: p.time ?? new Date().toISOString(),
        freshness: "live" as const,
      };
    });
  },
  async fetchCandles(symbol, granularitySec = 3600) {
    const data = (await tryJson([
      `/api/coinbase/market?product=${encodeURIComponent(symbol)}&granularity=${granularitySec}`,
      `http://127.0.0.1:8000/api/coinbase/market?product=${encodeURIComponent(symbol)}&granularity=${granularitySec}`,
    ])) as { candles?: Candle[]; ok?: boolean } | null;
    return data?.candles ?? [];
  },
  async fetchOrderBook(symbol) {
    const data = (await tryJson([
      `/api/coinbase/market?product=${encodeURIComponent(symbol)}`,
      `http://127.0.0.1:8000/api/coinbase/market?product=${encodeURIComponent(symbol)}`,
    ])) as {
      book?: {
        bids: { price: number; size: number }[];
        asks: { price: number; size: number }[];
        mid: number | null;
        spread: number | null;
        time: string | null;
      };
    } | null;
    if (!data?.book) return null;
    return {
      symbol,
      bids: data.book.bids.map((b) => ({ price: b.price, size: b.size })),
      asks: data.book.asks.map((a) => ({ price: a.price, size: a.size })),
      mid: data.book.mid,
      spread: data.book.spread,
      timestamp: data.book.time ?? new Date().toISOString(),
      freshness: "live",
    };
  },
};

export const DEFAULT_SYMBOL = ACTIVE_MARKET;
