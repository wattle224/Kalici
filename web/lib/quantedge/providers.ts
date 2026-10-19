import type { Candle, Instrument, OrderBook, Quote } from "./types";
import { ACTIVE_MARKET } from "@/lib/symbols";

export interface MarketProvider {
  id: string;
  label: string;
  fetchQuotes(symbols: string[]): Promise<Quote[]>;
  fetchCandles(symbol: string, granularitySec?: number): Promise<Candle[]>;
  fetchOrderBook(symbol: string): Promise<OrderBook | null>;
  fetchProducts(): Promise<Instrument[]>;
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
    "Live candles/depth for Coinbase USD crypto products (full Exchange catalog via dropdown). Equities/FX/futures remain simulated sample instruments until a licensed vendor is connected.",
  async fetchProducts() {
    const data = (await tryJson(["/api/coinbase/products"])) as {
      products?: {
        id: string;
        displayName: string;
        baseCurrency: string;
        quoteCurrency: string;
      }[];
    } | null;
    if (!data?.products?.length) return [];
    return data.products.map((p) => ({
      id: `cb-${p.id.toLowerCase()}`,
      symbol: p.id,
      name: p.displayName || `${p.baseCurrency} / ${p.quoteCurrency}`,
      exchange: "Coinbase",
      assetClass: "crypto" as const,
      currency: p.quoteCurrency || "USD",
      providerId: p.id,
    }));
  },
  async fetchQuotes(symbols) {
    if (!symbols.length) return [];
    // Coinbase ticker endpoint is per-product; batch via our API in chunks
    const chunkSize = 12;
    const out: Quote[] = [];
    for (let i = 0; i < symbols.length; i += chunkSize) {
      const chunk = symbols.slice(i, i + chunkSize);
      const data = (await tryJson([
        `/api/coinbase?products=${encodeURIComponent(chunk.join(","))}`,
      ])) as {
        products?: {
          symbol: string;
          price: number;
          bid: number | null;
          ask: number | null;
          time: string | null;
          volume: number | null;
        }[];
      } | null;
      if (!data?.products?.length) continue;
      for (const p of data.products) {
        out.push({
          symbol: p.symbol,
          last: p.price,
          bid: p.bid ?? undefined,
          ask: p.ask ?? undefined,
          change: 0,
          changePct: 0,
          volume: p.volume ?? undefined,
          timestamp: p.time ?? new Date().toISOString(),
          freshness: "live",
        });
      }
    }
    return out;
  },
  async fetchCandles(symbol, granularitySec = 3600) {
    const data = (await tryJson([
      `/api/coinbase/market?product=${encodeURIComponent(symbol)}&granularity=${granularitySec}&limit=168`,
    ])) as { candles?: Candle[]; ok?: boolean; error?: string } | null;
    return data?.candles ?? [];
  },
  async fetchOrderBook(symbol) {
    const data = (await tryJson([
      `/api/coinbase/market?product=${encodeURIComponent(symbol)}&depth=20`,
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
