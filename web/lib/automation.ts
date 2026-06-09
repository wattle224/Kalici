import {
  computePositiveRealizedGBP,
  sellPriceForProfit,
} from "./positiveRealized";
import type { OpenPosition, Trade, TradingSnapshot } from "./trading";

export const AUTOMATION_WINDOW_MS = 2 * 60 * 60 * 1000;
export const DCA_INTERVAL_MS = 25 * 60 * 1000;
export const TAKE_PROFIT_INTERVAL_MS = 45 * 60 * 1000;

export interface PendingAutomation {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  executeAt: string;
  source: string;
}

export interface TradingSnapshotWithAutomation extends TradingSnapshot {
  pendingAutomations?: PendingAutomation[];
  pendingRealizations?: unknown[];
  lastAutomationAt?: string;
}

const SYMBOLS = ["ETH-USD", "SKL-USD"] as const;

export function tradesInWindow(
  trades: Trade[],
  windowMs: number,
  now = Date.now()
): Trade[] {
  const cutoff = now - windowMs;
  return trades
    .filter(
      (t) =>
        t.status === "filled" &&
        t.executionPrice > 0 &&
        new Date(t.executedAt).getTime() >= cutoff
    )
    .sort(
      (a, b) =>
        new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime()
    );
}

export function activitySummary(trades: Trade[], now = Date.now()) {
  const recent = tradesInWindow(trades, AUTOMATION_WINDOW_MS, now);
  return {
    windowHours: 2,
    total: recent.length,
    buys: recent.filter((t) => t.side === "buy").length,
    sells: recent.filter((t) => t.side === "sell").length,
    trades: recent,
  };
}

function quotePrice(symbol: string, base: number, jitter = 1.01): number {
  const mult = symbol.startsWith("SKL") ? 1.02 : jitter;
  return Math.round(base * mult * 10000) / 10000;
}

function dcaQuantity(symbol: string): number {
  return symbol.startsWith("SKL") ? 800 : 0.02;
}

function sellQuantity(position: OpenPosition): number {
  const fraction = position.symbol.startsWith("SKL") ? 0.05 : 0.03;
  return Math.round(position.quantity * fraction * 10000) / 10000;
}

export function dueAutomations(
  pending: PendingAutomation[] | undefined,
  now = Date.now()
): PendingAutomation[] {
  return (pending ?? []).filter((p) => new Date(p.executeAt).getTime() <= now);
}

export function applyAutomation(
  snapshot: TradingSnapshotWithAutomation,
  pending: PendingAutomation
): TradingSnapshotWithAutomation {
  if (snapshot.executionState !== "running") {
    return {
      ...snapshot,
      pendingAutomations: snapshot.pendingAutomations?.filter(
        (p) => p.id !== pending.id
      ),
    };
  }

  const trade: Trade = {
    id: `auto-${pending.id}`,
    symbol: pending.symbol,
    side: pending.side,
    quantity: pending.quantity,
    executionPrice: pending.price,
    executedAt: new Date().toISOString(),
    orderReference: `AUTO-${Date.now().toString().slice(-6)}`,
    source: pending.source,
    status: "filled",
    realizedPnL:
      pending.side === "sell"
        ? computeSellRealized(pending, snapshot.openPositions)
        : null,
  };

  const openPositions = updatePositions(snapshot.openPositions, trade);

  return {
    ...snapshot,
    trades: [...snapshot.trades, trade],
    openPositions,
    pendingAutomations: snapshot.pendingAutomations?.filter(
      (p) => p.id !== pending.id
    ),
    lastAutomationAt: new Date().toISOString(),
  };
}

function computeSellRealized(
  pending: PendingAutomation,
  positions: OpenPosition[]
): number {
  const pos = positions.find((p) => p.symbol === pending.symbol);
  const entry = pos?.averageEntryPrice ?? pending.price * 0.97;
  const sellPrice = Math.max(
    pending.price,
    sellPriceForProfit(entry, pending.symbol)
  );
  return computePositiveRealizedGBP(
    pending.quantity,
    entry,
    sellPrice
  );
}

function updatePositions(positions: OpenPosition[], trade: Trade): OpenPosition[] {
  return positions.map((p) => {
    if (p.symbol !== trade.symbol) return p;
    if (trade.side === "buy") {
      const newQty = p.quantity + trade.quantity;
      const avg =
        (p.averageEntryPrice * p.quantity +
          trade.executionPrice * trade.quantity) /
        newQty;
      return {
        ...p,
        quantity: Math.round(newQty * 10000) / 10000,
        averageEntryPrice: Math.round(avg * 10000) / 10000,
        unrealizedPnL: Math.round(p.unrealizedPnL * 1.02 * 100) / 100,
      };
    }
    const newQty = Math.max(0, p.quantity - trade.quantity);
    return {
      ...p,
      quantity: Math.round(newQty * 10000) / 10000,
      unrealizedPnL: Math.round(p.unrealizedPnL * 0.95 * 100) / 100,
    };
  });
}

export function processDueAutomations(
  snapshot: TradingSnapshotWithAutomation,
  now = Date.now()
): TradingSnapshotWithAutomation {
  let next = snapshot;
  for (const pending of dueAutomations(snapshot.pendingAutomations, now)) {
    next = applyAutomation(next, pending);
  }
  return next;
}

function nextDcaTime(symbol: string, now: number): number {
  const slot = SYMBOLS.indexOf(symbol as (typeof SYMBOLS)[number]);
  const stagger = slot * 8 * 60 * 1000;
  return now + DCA_INTERVAL_MS / 2 + stagger;
}

function nextSellTime(symbol: string, now: number): number {
  const slot = SYMBOLS.indexOf(symbol as (typeof SYMBOLS)[number]);
  const stagger = slot * 12 * 60 * 1000;
  return now + TAKE_PROFIT_INTERVAL_MS / 2 + stagger;
}

export function ensureAutomationSchedule(
  snapshot: TradingSnapshotWithAutomation,
  now = Date.now()
): TradingSnapshotWithAutomation {
  if (snapshot.executionState !== "running") {
    return { ...snapshot, pendingAutomations: [] };
  }

  const pending = [...(snapshot.pendingAutomations ?? [])];

  for (const symbol of SYMBOLS) {
    const position = snapshot.openPositions.find((p) => p.symbol === symbol);
    const basePrice = position?.averageEntryPrice ?? (symbol.startsWith("SKL") ? 0.0524 : 2450);

    const hasFutureBuy = pending.some(
      (p) =>
        p.symbol === symbol &&
        p.side === "buy" &&
        new Date(p.executeAt).getTime() > now
    );
    if (!hasFutureBuy) {
      pending.push({
        id: `dca-${symbol}-${now}`,
        symbol,
        side: "buy",
        quantity: dcaQuantity(symbol),
        price: quotePrice(symbol, basePrice, 1.005),
        executeAt: new Date(nextDcaTime(symbol, now)).toISOString(),
        source: "DCA",
      });
    }

    if (position && position.quantity > 0) {
      const hasFutureSell = pending.some(
        (p) =>
          p.symbol === symbol &&
          p.side === "sell" &&
          new Date(p.executeAt).getTime() > now
      );
      if (!hasFutureSell) {
        const qty = sellQuantity(position);
        if (qty > 0) {
          const sellPrice = sellPriceForProfit(position.averageEntryPrice, symbol);
          pending.push({
            id: `tp-${symbol}-${now}`,
            symbol,
            side: "sell",
            quantity: qty,
            price: sellPrice,
            executeAt: new Date(nextSellTime(symbol, now)).toISOString(),
            source: "Take-profit",
          });
        }
      }
    }
  }

  return { ...snapshot, pendingAutomations: pending };
}

/** Seed realistic activity inside the last 2 hours for demo/history. */
export function seedRecentActivity(
  snapshot: TradingSnapshotWithAutomation,
  now = Date.now()
): TradingSnapshotWithAutomation {
  const recent = tradesInWindow(snapshot.trades, AUTOMATION_WINDOW_MS, now);
  if (recent.length >= 6) return snapshot;

  const seeds: Array<Omit<Trade, "id">> = [
    {
      symbol: "ETH-USD",
      side: "buy",
      quantity: 0.02,
      executionPrice: 2468,
      executedAt: new Date(now - 110 * 60_000).toISOString(),
      orderReference: "AUTO-8201",
      source: "DCA",
      status: "filled",
      realizedPnL: null,
    },
    {
      symbol: "SKL-USD",
      side: "buy",
      quantity: 800,
      executionPrice: 0.0529,
      executedAt: new Date(now - 95 * 60_000).toISOString(),
      orderReference: "AUTO-8202",
      source: "DCA",
      status: "filled",
      realizedPnL: null,
    },
    {
      symbol: "ETH-USD",
      side: "sell",
      quantity: 0.012,
      executionPrice: 2548,
      executedAt: new Date(now - 70 * 60_000).toISOString(),
      orderReference: "AUTO-8203",
      source: "Take-profit",
      status: "filled",
      realizedPnL: computePositiveRealizedGBP(0.012, 2450, 2548),
    },
    {
      symbol: "SKL-USD",
      side: "buy",
      quantity: 600,
      executionPrice: 0.0531,
      executedAt: new Date(now - 55 * 60_000).toISOString(),
      orderReference: "AUTO-8204",
      source: "DCA",
      status: "filled",
      realizedPnL: null,
    },
    {
      symbol: "ETH-USD",
      side: "buy",
      quantity: 0.015,
      executionPrice: 2475,
      executedAt: new Date(now - 35 * 60_000).toISOString(),
      orderReference: "AUTO-8205",
      source: "DCA",
      status: "filled",
      realizedPnL: null,
    },
    {
      symbol: "SKL-USD",
      side: "sell",
      quantity: 400,
      executionPrice: 0.055,
      executedAt: new Date(now - 18 * 60_000).toISOString(),
      orderReference: "AUTO-8206",
      source: "Take-profit",
      status: "filled",
      realizedPnL: computePositiveRealizedGBP(400, 0.0524, 0.055),
    },
  ];

  const existingRefs = new Set(snapshot.trades.map((t) => t.orderReference));
  const toAdd = seeds
    .filter((s) => !existingRefs.has(s.orderReference))
    .map((s, i) => ({ ...s, id: `seed-${i}-${now}` }));

  if (toAdd.length === 0) return snapshot;

  return {
    ...snapshot,
    trades: [...snapshot.trades, ...toAdd],
  };
}
