import type { OpenPosition, Trade } from "./trading";

export const DEFAULT_DEPOSIT_GBP = 1000;
export const CAPITAL_CURRENCY = "GBP" as const;

export type ModelDecision = {
  id: string;
  at: string;
  action: "BUY" | "SELL" | "HOLD";
  symbol: string;
  reason: string;
  score: number;
  quantity?: number;
  price?: number;
  notional?: number;
  cashAfter?: number;
};

export type CapitalAccount = {
  deposit: number;
  cash: number;
  currency: typeof CAPITAL_CURRENCY;
  /** Last observed mark price for the primary symbol (XRP-USD). */
  markPrice: number;
  lastDecisionAt?: string;
  /** Rolling decision log (newest first, capped). */
  decisions: ModelDecision[];
};

export function markPositionsValue(
  positions: OpenPosition[],
  markPrice: number
): number {
  return positions.reduce((sum, p) => {
    const px = p.symbol.startsWith("XRP") ? markPrice : p.averageEntryPrice;
    return sum + p.quantity * px;
  }, 0);
}

export function equityValue(
  cash: number,
  positions: OpenPosition[],
  markPrice: number
): number {
  return cash + markPositionsValue(positions, markPrice);
}

export function returnPct(equity: number, deposit: number): number {
  if (!deposit) return 0;
  return Math.round(((equity - deposit) / deposit) * 10000) / 100;
}

export function totalRealizedFromTrades(trades: Trade[]): number {
  return trades.reduce((s, t) => s + (t.realizedPnL ?? 0), 0);
}

export function freshCapital(deposit = DEFAULT_DEPOSIT_GBP): CapitalAccount {
  const d = Math.max(10, Math.round(deposit * 100) / 100);
  return {
    deposit: d,
    cash: d,
    currency: CAPITAL_CURRENCY,
    markPrice: 1.1611,
    decisions: [
      {
        id: `fund-${Date.now()}`,
        at: new Date().toISOString(),
        action: "HOLD",
        symbol: "XRP-USD",
        reason: `Account funded with £${d.toFixed(2)}. Model waiting for first opportunity.`,
        score: 0,
        cashAfter: d,
      },
    ],
  };
}
