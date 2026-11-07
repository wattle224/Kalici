/**
 * Deposit-based opportunity model.
 *
 * - Sizes buys from available cash (never spends more than cash).
 * - Decides BUY / SELL / HOLD from a simple score (momentum + mean-reversion
 *   + inventory / cash pressure).
 * - Records every decision so the UI can show *why* the model acted.
 */
import {
  type CapitalAccount,
  type ModelDecision,
  equityValue,
  freshCapital,
  markPositionsValue,
} from "./capital";
import type { OpenPosition, Trade, TradingSnapshot } from "./trading";
import type { TradingSnapshotWithAutomation } from "./automation";

export const PRIMARY_SYMBOL = "XRP-USD";
/** Minimum seconds between model decisions while ONLINE. */
export const DECISION_INTERVAL_MS = 18_000;
/** Keep this much cash as a reserve (fraction of deposit). */
const CASH_RESERVE_FRAC = 0.08;
/** Max fraction of equity to hold in the position. */
const MAX_EXPOSURE_FRAC = 0.55;
/** Typical buy size as fraction of spendable cash. */
const BUY_FRAC = 0.18;
/** Take-profit / stop-loss on unrealised move vs entry. */
const TAKE_PROFIT = 0.028;
const STOP_LOSS = 0.022;
const MIN_NOTIONAL = 15;

export type CapitalSnapshot = TradingSnapshotWithAutomation & {
  capital: CapitalAccount;
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function round4(n: number) {
  return Math.round(n * 10000) / 10000;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function recentFills(trades: Trade[], now: number, windowMs = 30 * 60_000) {
  return trades
    .filter(
      (t) =>
        t.status === "filled" &&
        t.executionPrice > 0 &&
        now - new Date(t.executedAt).getTime() <= windowMs
    )
    .sort(
      (a, b) =>
        new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime()
    );
}

/** Small random-walk mark so the model sees changing opportunities. */
export function nextMarkPrice(prev: number, now: number): number {
  // Deterministic-ish jitter from time so successive ticks differ.
  const t = (now % 10_000) / 10_000;
  const wave = Math.sin(now / 40_000) * 0.006;
  const noise = (t - 0.5) * 0.008;
  return round4(clamp(prev * (1 + wave + noise), 0.4, 5));
}

/**
 * Score in roughly [-1, +1]:
 *  + → buy opportunity
 *  − → sell opportunity
 */
export function scoreOpportunity(
  capital: CapitalAccount,
  positions: OpenPosition[],
  trades: Trade[],
  mark: number,
  now: number
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  const recent = recentFills(trades, now);
  if (recent.length >= 2) {
    const newest = recent[0].executionPrice;
    const older = recent[Math.min(3, recent.length - 1)].executionPrice;
    const mom = (newest - older) / older;
    score += clamp(mom * 25, -0.45, 0.45);
    reasons.push(
      `momentum ${(mom * 100).toFixed(2)}% over last ${recent.length} fills`
    );
  } else {
    // Mild mean-reversion vs long-run base when history is thin
    const base = 1.1611;
    const dist = (mark - base) / base;
    score -= clamp(dist * 8, -0.25, 0.25);
    reasons.push(
      `thin history — mean-reversion vs base ${((mark - base) / base * 100).toFixed(2)}%`
    );
  }

  const position = positions.find((p) => p.symbol === PRIMARY_SYMBOL);
  const equity = equityValue(capital.cash, positions, mark);
  const posValue = markPositionsValue(positions, mark);
  const exposure = equity > 0 ? posValue / equity : 0;

  if (position && position.quantity > 0) {
    const upnlPct =
      (mark - position.averageEntryPrice) / position.averageEntryPrice;
    if (upnlPct >= TAKE_PROFIT) {
      score -= 0.55;
      reasons.push(
        `take-profit armed (+${(upnlPct * 100).toFixed(2)}% vs entry)`
      );
    } else if (upnlPct <= -STOP_LOSS) {
      score -= 0.65;
      reasons.push(
        `stop-loss armed (${(upnlPct * 100).toFixed(2)}% vs entry)`
      );
    } else {
      reasons.push(
        `open XRP ${(upnlPct * 100).toFixed(2)}% vs entry · exposure ${(
          exposure * 100
        ).toFixed(0)}%`
      );
    }
  } else {
    // Idle cash pressure — nudge toward buying when heavily in cash
    const cashFrac = equity > 0 ? capital.cash / equity : 1;
    if (cashFrac > 0.85) {
      score += 0.35;
      reasons.push(`high cash ${(cashFrac * 100).toFixed(0)}% — look for entry`);
    }
  }

  if (exposure > MAX_EXPOSURE_FRAC) {
    score -= 0.4;
    reasons.push(
      `exposure ${(exposure * 100).toFixed(0)}% above ${(MAX_EXPOSURE_FRAC * 100).toFixed(0)}% cap`
    );
  }

  // Mild time-of-day style oscillation so the model does not always hold
  score += Math.sin(now / 90_000) * 0.12;

  return { score: clamp(score, -1, 1), reasons };
}

function applyBuy(
  snapshot: CapitalSnapshot,
  qty: number,
  price: number,
  now: number,
  reason: string,
  score: number
): CapitalSnapshot {
  const notional = round2(qty * price);
  if (notional > snapshot.capital.cash + 1e-9) return snapshot;

  const trade: Trade = {
    id: `mdl-buy-${now}`,
    symbol: PRIMARY_SYMBOL,
    side: "buy",
    orderType: "MARKET",
    quantity: qty,
    executionPrice: price,
    executedAt: new Date(now).toISOString(),
    orderReference: `LOCAL-${String(now).slice(-6)}`,
    source: "model",
    status: "filled",
    realizedPnL: null,
  };

  const cash = round2(snapshot.capital.cash - notional);
  const decision: ModelDecision = {
    id: `dec-${now}`,
    at: new Date(now).toISOString(),
    action: "BUY",
    symbol: PRIMARY_SYMBOL,
    reason,
    score: round4(score),
    quantity: qty,
    price,
    notional,
    cashAfter: cash,
  };

  return {
    ...snapshot,
    trades: [...snapshot.trades, trade],
    openPositions: upsertPosition(snapshot.openPositions, trade, price),
    capital: {
      ...snapshot.capital,
      cash,
      markPrice: price,
      lastDecisionAt: decision.at,
      decisions: [decision, ...(snapshot.capital.decisions ?? [])].slice(0, 40),
    },
    lastAutomationAt: decision.at,
  };
}

function applySell(
  snapshot: CapitalSnapshot,
  qty: number,
  price: number,
  now: number,
  reason: string,
  score: number
): CapitalSnapshot {
  const position = snapshot.openPositions.find(
    (p) => p.symbol === PRIMARY_SYMBOL
  );
  if (!position || position.quantity <= 0) return snapshot;
  const sellQty = Math.min(qty, position.quantity);
  const notional = round2(sellQty * price);
  const realized = round4(
    (price - position.averageEntryPrice) * sellQty
  );

  const trade: Trade = {
    id: `mdl-sell-${now}`,
    symbol: PRIMARY_SYMBOL,
    side: "sell",
    orderType: "MARKET",
    quantity: sellQty,
    executionPrice: price,
    executedAt: new Date(now).toISOString(),
    orderReference: `LOCAL-${String(now).slice(-6)}`,
    source: "model",
    status: "filled",
    realizedPnL: realized,
  };

  const cash = round2(snapshot.capital.cash + notional);
  const decision: ModelDecision = {
    id: `dec-${now}`,
    at: new Date(now).toISOString(),
    action: "SELL",
    symbol: PRIMARY_SYMBOL,
    reason: `${reason} · realised ${realized >= 0 ? "+" : ""}${realized.toFixed(4)}`,
    score: round4(score),
    quantity: sellQty,
    price,
    notional,
    cashAfter: cash,
  };

  return {
    ...snapshot,
    trades: [...snapshot.trades, trade],
    openPositions: upsertPosition(snapshot.openPositions, trade, price),
    capital: {
      ...snapshot.capital,
      cash,
      markPrice: price,
      lastDecisionAt: decision.at,
      decisions: [decision, ...(snapshot.capital.decisions ?? [])].slice(0, 40),
    },
    lastAutomationAt: decision.at,
  };
}

function applyHold(
  snapshot: CapitalSnapshot,
  mark: number,
  now: number,
  reason: string,
  score: number
): CapitalSnapshot {
  const decision: ModelDecision = {
    id: `dec-${now}`,
    at: new Date(now).toISOString(),
    action: "HOLD",
    symbol: PRIMARY_SYMBOL,
    reason,
    score: round4(score),
    cashAfter: snapshot.capital.cash,
  };
  return {
    ...snapshot,
    capital: {
      ...snapshot.capital,
      markPrice: mark,
      lastDecisionAt: decision.at,
      decisions: [decision, ...(snapshot.capital.decisions ?? [])].slice(0, 40),
    },
  };
}

function upsertPosition(
  positions: OpenPosition[],
  trade: Trade,
  mark: number
): OpenPosition[] {
  const existing = positions.find((p) => p.symbol === trade.symbol);
  if (!existing && trade.side === "buy") {
    return [
      ...positions,
      {
        symbol: trade.symbol,
        quantity: trade.quantity,
        averageEntryPrice: trade.executionPrice,
        unrealizedPnL: round4(
          (mark - trade.executionPrice) * trade.quantity
        ),
        quoteCurrency: "GBP",
      },
    ];
  }
  return positions
    .map((p) => {
      if (p.symbol !== trade.symbol) return p;
      if (trade.side === "buy") {
        const newQty = p.quantity + trade.quantity;
        const avg =
          (p.averageEntryPrice * p.quantity +
            trade.executionPrice * trade.quantity) /
          newQty;
        return {
          ...p,
          quantity: round4(newQty),
          averageEntryPrice: round4(avg),
          unrealizedPnL: round4((mark - avg) * newQty),
        };
      }
      const newQty = Math.max(0, p.quantity - trade.quantity);
      if (newQty < 1e-8) {
        return {
          ...p,
          quantity: 0,
          unrealizedPnL: 0,
        };
      }
      return {
        ...p,
        quantity: round4(newQty),
        unrealizedPnL: round4((mark - p.averageEntryPrice) * newQty),
      };
    })
    .filter((p) => p.quantity > 1e-8);
}

export function ensureCapital(
  snapshot: TradingSnapshotWithAutomation,
  deposit = snapshot.capital?.deposit ?? 1000
): CapitalSnapshot {
  if (snapshot.capital && typeof snapshot.capital.cash === "number") {
    return snapshot as CapitalSnapshot;
  }
  // Migrate: fund a fresh account. Open positions (if any) are marked but
  // cash starts at the full deposit so the model has capital to trade.
  return {
    ...snapshot,
    capital: freshCapital(deposit),
  };
}

export function setDeposit(
  snapshot: TradingSnapshotWithAutomation,
  amount: number
): CapitalSnapshot {
  const capital = freshCapital(amount);
  return {
    ...snapshot,
    trades: [],
    openPositions: [],
    pendingAutomations: [],
    capital,
    executionState: "running",
  };
}

/**
 * Advance the model by at most one decision when ONLINE and enough time
 * has elapsed since the last decision.
 */
export function tickDecisionEngine(
  raw: TradingSnapshotWithAutomation,
  now = Date.now()
): CapitalSnapshot {
  const snapshot = ensureCapital(raw);

  if (snapshot.executionState !== "running") {
    return snapshot;
  }

  const lastAt = snapshot.capital.lastDecisionAt
    ? new Date(snapshot.capital.lastDecisionAt).getTime()
    : 0;
  if (now - lastAt < DECISION_INTERVAL_MS) {
    // Still refresh mark so unrealised PnL moves between decisions
    const mark = nextMarkPrice(snapshot.capital.markPrice, now);
    return {
      ...snapshot,
      openPositions: snapshot.openPositions.map((p) =>
        p.symbol.startsWith("XRP")
          ? {
              ...p,
              unrealizedPnL: round4(
                (mark - p.averageEntryPrice) * p.quantity
              ),
            }
          : p
      ),
      capital: { ...snapshot.capital, markPrice: mark },
    };
  }

  const mark = nextMarkPrice(snapshot.capital.markPrice, now);
  const { score, reasons } = scoreOpportunity(
    snapshot.capital,
    snapshot.openPositions,
    snapshot.trades,
    mark,
    now
  );
  const reason = reasons.join("; ");
  const position = snapshot.openPositions.find(
    (p) => p.symbol === PRIMARY_SYMBOL
  );
  const equity = equityValue(
    snapshot.capital.cash,
    snapshot.openPositions,
    mark
  );
  const reserve = snapshot.capital.deposit * CASH_RESERVE_FRAC;
  const spendable = Math.max(0, snapshot.capital.cash - reserve);
  const exposure =
    equity > 0 ? markPositionsValue(snapshot.openPositions, mark) / equity : 0;

  // --- SELL checks first (protect capital) ---
  if (position && position.quantity > 0) {
    const upnlPct =
      (mark - position.averageEntryPrice) / position.averageEntryPrice;
    if (upnlPct >= TAKE_PROFIT || upnlPct <= -STOP_LOSS || score < -0.25) {
      const sellFrac =
        upnlPct <= -STOP_LOSS || score < -0.45 ? 1 : 0.5;
      const qty = round4(position.quantity * sellFrac);
      return applySell(
        { ...snapshot, capital: { ...snapshot.capital, markPrice: mark } },
        qty,
        mark,
        now,
        score < -0.25
          ? `Model SELL — bearish score ${score.toFixed(2)} (${reason})`
          : upnlPct >= TAKE_PROFIT
          ? `Model SELL — take profit (${reason})`
          : `Model SELL — stop loss (${reason})`,
        score
      );
    }
  }

  // --- BUY when opportunity + cash + room under exposure cap ---
  if (
    score > 0.22 &&
    spendable >= MIN_NOTIONAL &&
    exposure < MAX_EXPOSURE_FRAC
  ) {
    const buyCash = Math.min(
      spendable * (BUY_FRAC + Math.min(0.12, score * 0.15)),
      spendable,
      equity * (MAX_EXPOSURE_FRAC - exposure)
    );
    if (buyCash >= MIN_NOTIONAL) {
      const qty = round4(buyCash / mark);
      return applyBuy(
        { ...snapshot, capital: { ...snapshot.capital, markPrice: mark } },
        qty,
        mark,
        now,
        `Model BUY — bullish score ${score.toFixed(2)} (${reason})`,
        score
      );
    }
  }

  return applyHold(
    { ...snapshot, capital: { ...snapshot.capital, markPrice: mark } },
    mark,
    now,
    `Model HOLD — score ${score.toFixed(2)} (${reason})`,
    score
  );
}
