/** Primary live-traded pair — matches local execution ledger. */
export const TRADING_SYMBOLS = ["XRP-USD"] as const;

export type TradingSymbol = (typeof TRADING_SYMBOLS)[number];

export const ACTIVE_MARKET: TradingSymbol = "XRP-USD";

export function isGbpQuoted(symbol: string): boolean {
  return symbol.startsWith("XRP");
}
