/**
 * QuantEdge autonomous trade decisions from local analysis + available funds.
 *
 * Positive-return gate (by construction for *realized* PnL):
 * - Never sells at a loss (only take-profit exits).
 * - Never buys without cash / never oversizes past risk caps.
 * - Skips entries in risk-off / downtrend / overbought regimes.
 *
 * Unrealized marks can still draw down while a position is held.
 * Fills are paper/simulated only — not live brokerage.
 */

import { analyzeCandles, type InstrumentAnalysis } from "./analysis";
import type { Candle, OrderSide, Position, Quote, SimulatedOrder } from "./types";

export const DEFAULT_PAPER_CASH_USD = 10_000;

/** Minimum unrealized gain (%) before Auto will sell. */
export const MIN_TAKE_PROFIT_PCT = 0.75;

/** Max fraction of equity deployed into a single new buy. */
export const MAX_BUY_EQUITY_FRAC = 0.2;

/** Keep this fraction of cash uninvested as reserve. */
export const CASH_RESERVE_FRAC = 0.15;

/** Minimum confidence from local regime tool to enter. */
export const MIN_ENTRY_CONFIDENCE = 0.55;

export type AutoDecisionAction = "buy" | "sell" | "hold";

export interface AutoDecision {
  action: AutoDecisionAction;
  symbol: string;
  side?: OrderSide;
  quantity: number;
  price: number;
  notional: number;
  rationale: string[];
  analysis: InstrumentAnalysis;
  at: string;
  funds: {
    cash: number;
    equity: number;
    positionQty: number;
    unrealizedPnlPct: number | null;
  };
}

export interface PaperLedger {
  cash: number;
  positions: Position[];
  realizedPnl: number;
}

export function rebuildLedger(
  startingCash: number,
  orders: SimulatedOrder[],
  quoteMap: Map<string, Quote>
): PaperLedger {
  let cash = startingCash;
  let realizedPnl = 0;
  const lots = new Map<string, { qty: number; avg: number; currency: string }>();

  const filled = [...orders]
    .filter((o) => o.status === "filled")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  for (const o of filled) {
    const px = o.fillPrice ?? o.limitPrice ?? 0;
    if (!(px > 0) || !(o.quantity > 0)) continue;
    const cur = lots.get(o.symbol) ?? { qty: 0, avg: 0, currency: "USD" };

    if (o.side === "buy") {
      const cost = px * o.quantity;
      if (cost > cash + 1e-9) continue;
      cash -= cost;
      const newQty = cur.qty + o.quantity;
      cur.avg = newQty > 0 ? (cur.avg * cur.qty + cost) / newQty : 0;
      cur.qty = newQty;
      lots.set(o.symbol, cur);
    } else {
      const sellQty = Math.min(o.quantity, cur.qty);
      if (sellQty <= 0) continue;
      const proceeds = px * sellQty;
      const costBasis = cur.avg * sellQty;
      const pnl = proceeds - costBasis;
      // Auto never submits loss sells; manual ticket may. Always book the fill.
      cash += proceeds;
      realizedPnl += pnl;
      cur.qty -= sellQty;
      if (cur.qty <= 1e-12) {
        lots.delete(o.symbol);
      } else {
        lots.set(o.symbol, cur);
      }
    }
  }

  const positions: Position[] = [];
  for (const [symbol, lot] of lots) {
    if (lot.qty <= 0) continue;
    const mark = quoteMap.get(symbol)?.last ?? lot.avg;
    positions.push({
      symbol,
      quantity: lot.qty,
      avgPrice: lot.avg,
      marketPrice: mark,
      unrealizedPnl: (mark - lot.avg) * lot.qty,
      realizedPnl: 0,
      currency: lot.currency,
    });
  }

  return { cash, positions, realizedPnl };
}

export function decideAutoTrade(input: {
  symbol: string;
  candles: Candle[];
  quote: Quote | undefined;
  ledger: PaperLedger;
  startingCash: number;
}): AutoDecision {
  const { symbol, candles, quote, ledger } = input;
  const analysis = analyzeCandles(symbol, candles);
  const price = quote?.last || analysis.facts.last || 0;
  const pos = ledger.positions.find((p) => p.symbol === symbol);
  const positionQty = pos?.quantity ?? 0;
  const unrealizedPnlPct =
    pos && pos.avgPrice > 0
      ? ((pos.marketPrice - pos.avgPrice) / pos.avgPrice) * 100
      : null;

  const equity =
    ledger.cash +
    ledger.positions.reduce((s, p) => s + p.quantity * p.marketPrice, 0);

  const base: Omit<AutoDecision, "action" | "side" | "quantity" | "notional" | "rationale"> =
    {
      symbol,
      price,
      analysis,
      at: new Date().toISOString(),
      funds: {
        cash: ledger.cash,
        equity,
        positionQty,
        unrealizedPnlPct,
      },
    };

  const hold = (rationale: string[]): AutoDecision => ({
    ...base,
    action: "hold",
    quantity: 0,
    notional: 0,
    rationale,
  });

  if (!(price > 0) || candles.length < 8) {
    return hold([
      "Insufficient price/candle data for a decision.",
      "Waiting for live OHLC before Auto can trade.",
    ]);
  }

  // --- Take-profit sell (only when already profitable) ---
  if (positionQty > 0 && unrealizedPnlPct != null) {
    if (unrealizedPnlPct >= MIN_TAKE_PROFIT_PCT) {
      const sellQty = Number(positionQty.toFixed(8));
      return {
        ...base,
        action: "sell",
        side: "sell",
        quantity: sellQty,
        notional: sellQty * price,
        rationale: [
          `Positive-return gate: unrealized +${unrealizedPnlPct.toFixed(2)}% ≥ ${MIN_TAKE_PROFIT_PCT}% take-profit.`,
          `Regime: ${analysis.regime.label} @ ${(analysis.regime.confidence * 100).toFixed(0)}%.`,
          `Selling full position (${sellQty}) to lock realized gain.`,
          `Available cash after: ~$${(ledger.cash + sellQty * price).toFixed(2)}.`,
        ],
      };
    }

    // Never sell at a loss — hold until profitable
    if (unrealizedPnlPct < MIN_TAKE_PROFIT_PCT) {
      // Fall through: may still hold for re-entry sizing; do not sell
      if (unrealizedPnlPct < 0) {
        return hold([
          `Positive-return gate: refusing loss sell (unrealized ${unrealizedPnlPct.toFixed(2)}%).`,
          "Holding until mark recovers above take-profit threshold.",
          ...analysis.regime.evidence.slice(0, 2),
        ]);
      }
    }
  }

  // --- Entry buy from local findings ---
  const regime = analysis.regime.label;
  const conf = analysis.regime.confidence;
  const rsi = analysis.calculated.rsi14;
  const mom = analysis.calculated.momentum20;

  const bullish =
    regime === "trending_up" ||
    regime === "risk_on" ||
    (regime === "low_vol" && (mom ?? 0) > 2);

  const blockedRegime =
    regime === "trending_down" ||
    regime === "risk_off" ||
    regime === "high_vol";

  if (blockedRegime) {
    return hold([
      `Findings: regime=${regime} — Auto skips new buys (capital preservation).`,
      ...analysis.regime.evidence.slice(0, 2),
      positionQty > 0
        ? "Existing position held until take-profit (no loss sell)."
        : "No open position.",
    ]);
  }

  if (!bullish || conf < MIN_ENTRY_CONFIDENCE) {
    return hold([
      `Findings not strong enough to buy (regime=${regime}, confidence=${(conf * 100).toFixed(0)}%).`,
      rsi != null ? `RSI(14)=${rsi}.` : "RSI unavailable.",
      "Waiting for clearer positive edge.",
    ]);
  }

  if (rsi != null && rsi >= 70) {
    return hold([
      `Overbought gate: RSI(14)=${rsi} ≥ 70 — skip buy to protect return.`,
      `Regime still ${regime}; waiting for pullback.`,
    ]);
  }

  if (positionQty > 0) {
    return hold([
      "Already holding this symbol — wait for take-profit before adding risk.",
      unrealizedPnlPct != null
        ? `Unrealized ${unrealizedPnlPct >= 0 ? "+" : ""}${unrealizedPnlPct.toFixed(2)}% (need ≥ ${MIN_TAKE_PROFIT_PCT}% to sell).`
        : "Unrealized mark pending.",
    ]);
  }

  const spendable = Math.max(0, ledger.cash * (1 - CASH_RESERVE_FRAC));
  const capByEquity = equity * MAX_BUY_EQUITY_FRAC;
  const notional = Math.min(spendable, capByEquity);

  if (notional < price * 0.0001 || notional < 5) {
    return hold([
      `Insufficient funds for a buy (cash $${ledger.cash.toFixed(2)}, reserve ${(CASH_RESERVE_FRAC * 100).toFixed(0)}%).`,
      "Auto will wait until cash or equity allows a sized entry.",
    ]);
  }

  const quantity = Number((notional / price).toFixed(8));
  if (!(quantity > 0)) {
    return hold(["Computed quantity was zero — hold."]);
  }

  return {
    ...base,
    action: "buy",
    side: "buy",
    quantity,
    notional: quantity * price,
    rationale: [
      `Findings: ${regime} @ ${(conf * 100).toFixed(0)}% — entering long.`,
      ...analysis.regime.evidence.slice(0, 2),
      rsi != null ? `RSI(14)=${rsi} (not overbought).` : "RSI n/a.",
      mom != null ? `Momentum20=${mom.toFixed(1)}%.` : "",
      `Sized to $${(quantity * price).toFixed(2)} (≤${(MAX_BUY_EQUITY_FRAC * 100).toFixed(0)}% equity, ${(CASH_RESERVE_FRAC * 100).toFixed(0)}% cash reserve).`,
      `Funds: cash $${ledger.cash.toFixed(2)} → remaining ~$${(ledger.cash - quantity * price).toFixed(2)}.`,
      `Exit rule: sell only when unrealized ≥ +${MIN_TAKE_PROFIT_PCT}% (positive realized return).`,
    ].filter(Boolean),
  };
}
