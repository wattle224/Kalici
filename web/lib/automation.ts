import {
  computePositiveRealizedGBP,
  sellPriceForProfit,
} from "./positiveRealized";
import type { OpenPosition, Trade, TradingSnapshot } from "./trading";

export const AUTOMATION_WINDOW_MS = 2 * 60 * 60 * 1000;
export const DCA_INTERVAL_MS = 8 * 60 * 1000;
export const TAKE_PROFIT_INTERVAL_MS = 12 * 60 * 1000;
/** Kickstart orders fire immediately (small stagger so both symbols fill same tick). */
export const KICKSTART_BUY_MS = 0;
export const KICKSTART_SELL_MS = 5 * 1000;

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

function hasRecentAutomation(
  snapshot: TradingSnapshotWithAutomation,
  now: number,
  windowMs = 15 * 60 * 1000
): boolean {
  if (snapshot.lastAutomationAt) {
    return now - new Date(snapshot.lastAutomationAt).getTime() < windowMs;
  }
  return snapshot.trades.some(
    (t) =>
      t.status === "filled" &&
      t.executionPrice > 0 &&
      now - new Date(t.executedAt).getTime() < windowMs
  );
}

function nextDcaTime(
  symbol: string,
  now: number,
  kickstart: boolean
): number {
  const slot = SYMBOLS.indexOf(symbol as (typeof SYMBOLS)[number]);
  const stagger = kickstart ? slot * 2_000 : slot * 45_000;
  if (kickstart) return now + KICKSTART_BUY_MS + stagger;
  return now + DCA_INTERVAL_MS + stagger;
}

function nextSellTime(
  symbol: string,
  now: number,
  kickstart: boolean
): number {
  const slot = SYMBOLS.indexOf(symbol as (typeof SYMBOLS)[number]);
  const stagger = kickstart ? slot * 3_000 : slot * 60_000;
  if (kickstart) return now + KICKSTART_SELL_MS + stagger;
  return now + TAKE_PROFIT_INTERVAL_MS + stagger;
}

/** When ONLINE, ensure orders are queued within minutes — not empty queue. */
export function kickstartExecution(
  snapshot: TradingSnapshotWithAutomation,
  now = Date.now()
): TradingSnapshotWithAutomation {
  return ensureAutomationSchedule(snapshot, now, true);
}

export function ensureAutomationSchedule(
  snapshot: TradingSnapshotWithAutomation,
  now = Date.now(),
  forceKickstart = false
): TradingSnapshotWithAutomation {
  if (snapshot.executionState !== "running") {
    return { ...snapshot, pendingAutomations: [] };
  }

  let pending = [...(snapshot.pendingAutomations ?? [])];
  const kickstart =
    forceKickstart ||
    !hasRecentAutomation(snapshot, now) ||
    !pending.some((p) => new Date(p.executeAt).getTime() < now + 5 * 60 * 1000);

  // Stale far-future queue blocks kickstart — replace with near-term orders when ONLINE.
  if (kickstart) {
    pending = pending.filter((p) => new Date(p.executeAt).getTime() <= now);
  }

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
        executeAt: new Date(nextDcaTime(symbol, now, kickstart)).toISOString(),
        source: kickstart ? "DCA (kickstart)" : "DCA",
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
            executeAt: new Date(nextSellTime(symbol, now, kickstart)).toISOString(),
            source: kickstart ? "Take-profit (kickstart)" : "Take-profit",
          });
        }
      }
    }
  }

  return { ...snapshot, pendingAutomations: pending };
}

const SEED_ORDER_OFFSETS_MIN: Record<string, number> = {
  "AUTO-8201": 110,
  "AUTO-8202": 95,
  "AUTO-8203": 70,
  "AUTO-8204": 55,
  "AUTO-8205": 35,
  "AUTO-8206": 18,
};

/** Re-anchor demo seed rows so they stay inside the 2h window (stale ISO timestamps age out). */
export function reanchorSeedTimestamps(
  trades: Trade[],
  now = Date.now()
): Trade[] {
  return trades.map((trade) => {
    const offsetMin = SEED_ORDER_OFFSETS_MIN[trade.orderReference];
    if (offsetMin == null) return trade;
    return {
      ...trade,
      executedAt: new Date(now - offsetMin * 60_000).toISOString(),
    };
  });
}

/** When ONLINE but history is empty, fill at least one buy per symbol immediately. */
export function fillGapWhenOnline(
  snapshot: TradingSnapshotWithAutomation,
  now = Date.now()
): TradingSnapshotWithAutomation {
  if (snapshot.executionState !== "running") return snapshot;

  const recent = tradesInWindow(snapshot.trades, AUTOMATION_WINDOW_MS, now);
  if (recent.length >= 2) return snapshot;

  let next = snapshot;
  for (const symbol of SYMBOLS) {
    const hasRecent = recent.some((t) => t.symbol === symbol);
    if (hasRecent) continue;

    const position = next.openPositions.find((p) => p.symbol === symbol);
    const basePrice =
      position?.averageEntryPrice ?? (symbol.startsWith("SKL") ? 0.0524 : 2450);

    next = applyAutomation(next, {
      id: `live-buy-${symbol}-${now}`,
      symbol,
      side: "buy",
      quantity: dcaQuantity(symbol),
      price: quotePrice(symbol, basePrice, 1.005),
      executeAt: new Date(now).toISOString(),
      source: "Live fill (ONLINE)",
    });
  }

  return next;
}

/** Seed realistic activity inside the last 2 hours for demo/history. */
export function seedRecentActivity(
  snapshot: TradingSnapshotWithAutomation,
  now = Date.now()
): TradingSnapshotWithAutomation {
  const tradesWithFreshSeeds = reanchorSeedTimestamps(snapshot.trades, now);
  const reanchoredSnapshot = { ...snapshot, trades: tradesWithFreshSeeds };
  const recent = tradesInWindow(
    reanchoredSnapshot.trades,
    AUTOMATION_WINDOW_MS,
    now
  );
  if (recent.length >= 6) return reanchoredSnapshot;

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

  const existingRefs = new Set(
    reanchoredSnapshot.trades.map((t) => t.orderReference)
  );
  const toAdd = seeds
    .filter((s) => !existingRefs.has(s.orderReference))
    .map((s, i) => ({ ...s, id: `seed-${i}-${now}` }));

  if (toAdd.length === 0) return reanchoredSnapshot;

  return {
    ...reanchoredSnapshot,
    trades: [...reanchoredSnapshot.trades, ...toAdd],
  };
}
