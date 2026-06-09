import type { OpenPosition, Trade } from "./trading";

export interface MarketTicker {
  symbol: string;
  price: number;
  change24hPct: number;
}

const EXTRA_GAINERS: MarketTicker[] = [
  { symbol: "XRP-USD", price: 1.18, change24hPct: 1.6 },
  { symbol: "BTC-USD", price: 68_420, change24hPct: 2.4 },
  { symbol: "SOL-USD", price: 142.5, change24hPct: 5.1 },
  { symbol: "LINK-USD", price: 14.82, change24hPct: 3.8 },
];

export function positionChangePct(position: OpenPosition): number {
  const cost = position.averageEntryPrice * position.quantity;
  if (cost <= 0) return 0;
  return Math.round((position.unrealizedPnL / cost) * 100 * 100) / 100;
}

export function buildMarketTickers(positions: OpenPosition[]): MarketTicker[] {
  const fromPositions = positions.map((p) => ({
    symbol: p.symbol,
    price: p.averageEntryPrice * (1 + positionChangePct(p) / 100),
    change24hPct: positionChangePct(p),
  }));
  const merged = [...fromPositions, ...EXTRA_GAINERS];
  const seen = new Set<string>();
  return merged.filter((t) => {
    if (seen.has(t.symbol)) return false;
    seen.add(t.symbol);
    return true;
  });
}

export function gainers(tickers: MarketTicker[]): MarketTicker[] {
  return tickers
    .filter((t) => t.change24hPct > 0)
    .sort((a, b) => b.change24hPct - a.change24hPct);
}

export function gainerSymbols(tickers: MarketTicker[]): Set<string> {
  return new Set(gainers(tickers).map((t) => t.symbol));
}

export function filterTradesByGainers(trades: Trade[], tickers: MarketTicker[]): Trade[] {
  const symbols = gainerSymbols(tickers);
  return trades.filter((t) => symbols.has(t.symbol));
}

export function filterPositionsByGainers(
  positions: OpenPosition[],
  tickers: MarketTicker[]
): OpenPosition[] {
  const symbols = gainerSymbols(tickers);
  return positions.filter((p) => symbols.has(p.symbol));
}

export function formatChangePct(pct: number): string {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}
