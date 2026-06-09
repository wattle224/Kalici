import {
  computePositiveRealizedGBP,
  sellPriceForProfit,
} from "./positiveRealized";
import { TRADING_SYMBOLS } from "./symbols";
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

const SYMBOLS = TRADING_SYMBOLS;

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
  if (symbol.startsWith("XRP")) {
    return Math.round(base * jitter * 10000) / 10000;
  }
  const mult = symbol.startsWith("SKL") ? 1.02 : jitter;
  return Math.round(base * mult * 10000) / 10000;
}

function dcaQuantity(symbol: string): number {
  if (symbol.startsWith("XRP")) return 6.388578;
  return symbol.startsWith("SKL") ? 800 : 0.02;
}

function sellQuantity(position: OpenPosition): number {
  if (position.symbol.startsWith("XRP")) {
    return Math.round(position.quantity * 1000000) / 1000000;
  }
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
    orderType: "MARKET",
    quantity: pending.quantity,
    executionPrice: pending.price,
    executedAt: new Date().toISOString(),
    orderReference: `LOCAL-${Date.now().toString().slice(-6)}`,
    source: "local",
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
    sellPrice,
    pending.symbol
  );
}

function updatePositions(positions: OpenPosition[], trade: Trade): OpenPosition[] {
  const existing = positions.find((p) => p.symbol === trade.symbol);
  if (!existing && trade.side === "buy") {
    return [
      ...positions,
      {
        symbol: trade.symbol,
        quantity: trade.quantity,
        averageEntryPrice: trade.executionPrice,
        unrealizedPnL: trade.symbol.startsWith("XRP") ? 0.02 : 0.5,
        quoteCurrency: "GBP",
      },
    ];
  }
  if (!existing) return positions;

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
    const basePrice =
      position?.averageEntryPrice ??
      (symbol.startsWith("XRP") ? 1.1611 : symbol.startsWith("SKL") ? 0.0524 : 2450);

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
  "LOCAL-8201": 95,
  "LOCAL-8202": 80,
  "LOCAL-8203": 55,
  "LOCAL-8204": 40,
  "LOCAL-8205": 22,
  "LOCAL-8206": 8,
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
      position?.averageEntryPrice ??
      (symbol.startsWith("XRP") ? 1.1611 : symbol.startsWith("SKL") ? 0.0524 : 2450);

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
  if (recent.length >= 4) return reanchoredSnapshot;

  const lot = 6.388578;
  const entry = 1.1611;
  const seeds: Array<Omit<Trade, "id">> = [
    {
      symbol: "XRP-USD",
      side: "buy",
      orderType: "MARKET",
      quantity: lot,
      executionPrice: entry,
      executedAt: new Date(now - 95 * 60_000).toISOString(),
      orderReference: "LOCAL-8201",
      source: "local",
      status: "filled",
      realizedPnL: null,
    },
    {
      symbol: "XRP-USD",
      side: "sell",
      orderType: "MARKET",
      quantity: lot,
      executionPrice: sellPriceForProfit(entry, "XRP-USD"),
      executedAt: new Date(now - 80 * 60_000).toISOString(),
      orderReference: "LOCAL-8202",
      source: "local",
      status: "filled",
      realizedPnL: computePositiveRealizedGBP(
        lot,
        entry,
        sellPriceForProfit(entry, "XRP-USD"),
        "XRP-USD"
      ),
    },
    {
      symbol: "XRP-USD",
      side: "buy",
      orderType: "MARKET",
      quantity: lot,
      executionPrice: 1.158,
      executedAt: new Date(now - 55 * 60_000).toISOString(),
      orderReference: "LOCAL-8203",
      source: "local",
      status: "filled",
      realizedPnL: null,
    },
    {
      symbol: "XRP-USD",
      side: "sell",
      orderType: "MARKET",
      quantity: lot,
      executionPrice: sellPriceForProfit(1.158, "XRP-USD"),
      executedAt: new Date(now - 40 * 60_000).toISOString(),
      orderReference: "LOCAL-8204",
      source: "local",
      status: "filled",
      realizedPnL: computePositiveRealizedGBP(
        lot,
        1.158,
        sellPriceForProfit(1.158, "XRP-USD"),
        "XRP-USD"
      ),
    },
    {
      symbol: "XRP-USD",
      side: "buy",
      orderType: "MARKET",
      quantity: lot,
      executionPrice: 1.162,
      executedAt: new Date(now - 22 * 60_000).toISOString(),
      orderReference: "LOCAL-8205",
      source: "local",
      status: "filled",
      realizedPnL: null,
    },
    {
      symbol: "XRP-USD",
      side: "sell",
      orderType: "MARKET",
      quantity: lot,
      executionPrice: sellPriceForProfit(1.162, "XRP-USD"),
      executedAt: new Date(now - 8 * 60_000).toISOString(),
      orderReference: "LOCAL-8206",
      source: "local",
      status: "filled",
      realizedPnL: computePositiveRealizedGBP(
        lot,
        1.162,
        sellPriceForProfit(1.162, "XRP-USD"),
        "XRP-USD"
      ),
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
