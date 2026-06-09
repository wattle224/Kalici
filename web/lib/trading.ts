import {
  ensureRealizationSchedule,
  processDueRealizations,
  type TradingSnapshotWithSchedule,
} from "./realization";

export type { TradingSnapshotWithSchedule } from "./realization";

export type TradeSide = "buy" | "sell";
export type TradeStatus = "filled" | "skipped" | "pending";
export type ExecutionState = "running" | "paused";

export interface Trade {
  id: string;
  symbol: string;
  side: TradeSide;
  quantity: number;
  executionPrice: number;
  executedAt: string;
  orderReference: string;
  source: string;
  status: TradeStatus;
  realizedPnL: number | null;
}

export interface OpenPosition {
  symbol: string;
  quantity: number;
  averageEntryPrice: number;
  unrealizedPnL: number;
  quoteCurrency: string;
}

export interface TradingSnapshot {
  schemaVersion: number;
  executionState: ExecutionState;
  trades: Trade[];
  openPositions: OpenPosition[];
}

export const SCHEMA_VERSION = 3;
export const STORAGE_KEY = "kalici.trading.snapshot";

/** Applies to every pair: ETH-USD, SKL-USD, BTC-USD, etc. */
export function isSettledFill(trade: Trade): boolean {
  return (
    trade.status === "filled" &&
    trade.executionPrice > 0 &&
    trade.quantity > 0
  );
}

export function settledFills(trades: Trade[]): Trade[] {
  return trades
    .filter(isSettledFill)
    .sort(
      (a, b) =>
        new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime()
    );
}

export function skippedWhilePaused(trades: Trade[]): Trade[] {
  return trades
    .filter(
      (t) =>
        t.status === "skipped" ||
        (t.executionPrice === 0 && t.status !== "filled")
    )
    .sort(
      (a, b) =>
        new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime()
    );
}

export function tradesForSymbol(trades: Trade[], symbol: string): Trade[] {
  return settledFills(trades).filter((t) => t.symbol === symbol);
}

export function containsCorruptHistory(snapshot: TradingSnapshot): boolean {
  const zeroPriceFilled = snapshot.trades.some(
    (t) => t.executionPrice === 0 && t.status === "filled"
  );
  const positionPnL = snapshot.openPositions.map((p) => p.unrealizedPnL);
  const duplicatePnLOnRows = snapshot.trades.filter(
    (t) =>
      t.realizedPnL != null &&
      positionPnL.includes(t.realizedPnL) &&
      isSettledFill(t)
  );
  return zeroPriceFilled || duplicatePnLOnRows.length > 1;
}

export function sanitize(snapshot: TradingSnapshot): TradingSnapshot {
  const trades = snapshot.trades.map((trade) => {
    if (trade.executionPrice === 0 && trade.status === "filled") {
      return {
        ...trade,
        status: "skipped" as const,
        realizedPnL: null,
      };
    }
    if (trade.executionPrice === 0 && trade.status !== "skipped") {
      return { ...trade, status: "skipped" as const, realizedPnL: null };
    }
    if (
      trade.realizedPnL != null &&
      snapshot.openPositions.some((p) => p.unrealizedPnL === trade.realizedPnL)
    ) {
      return { ...trade, realizedPnL: null };
    }
    return trade;
  });
  return { ...snapshot, trades, schemaVersion: SCHEMA_VERSION };
}

export function cleanBootstrap(): TradingSnapshot {
  const now = Date.now();
  const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString();

  return {
    schemaVersion: SCHEMA_VERSION,
    executionState: "paused",
    openPositions: [
      {
        symbol: "ETH-USD",
        quantity: 0.42,
        averageEntryPrice: 2450,
        unrealizedPnL: 71.4,
        quoteCurrency: "GBP",
      },
      {
        symbol: "SKL-USD",
        quantity: 12_500,
        averageEntryPrice: 0.0524,
        unrealizedPnL: 18.25,
        quoteCurrency: "GBP",
      },
    ],
    trades: [
      {
        id: "eth-fill-1",
        symbol: "ETH-USD",
        side: "buy",
        quantity: 0.42,
        executionPrice: 2450,
        executedAt: new Date(now - 3 * 86400_000).toISOString(),
        orderReference: "AUTO-9001",
        source: "DCA",
        status: "filled",
        realizedPnL: null,
      },
      {
        id: "skl-fill-1",
        symbol: "SKL-USD",
        side: "buy",
        quantity: 12_500,
        executionPrice: 0.0524,
        executedAt: new Date(now - 2 * 86400_000).toISOString(),
        orderReference: "AUTO-9002",
        source: "DCA",
        status: "filled",
        realizedPnL: null,
      },
      // Legacy bug rows (zero price while paused) — must not appear in history.
      {
        id: "eth-skip-1",
        symbol: "ETH-USD",
        side: "buy",
        quantity: 0.05,
        executionPrice: 0,
        executedAt: hoursAgo(3),
        orderReference: "AUTO-9010",
        source: "Rebalance (paused)",
        status: "skipped",
        realizedPnL: null,
      },
      {
        id: "skl-skip-1",
        symbol: "SKL-USD",
        side: "buy",
        quantity: 2000,
        executionPrice: 0,
        executedAt: hoursAgo(2),
        orderReference: "AUTO-9011",
        source: "Rebalance (paused)",
        status: "skipped",
        realizedPnL: null,
      },
      {
        id: "skl-skip-2",
        symbol: "SKL-USD",
        side: "buy",
        quantity: 3500,
        executionPrice: 0,
        executedAt: hoursAgo(1),
        orderReference: "AUTO-9012",
        source: "Rebalance (paused)",
        status: "skipped",
        realizedPnL: null,
      },
    ],
  };
}

export function hydrateSnapshot(
  snapshot: TradingSnapshotWithSchedule
): TradingSnapshotWithSchedule {
  const sanitized = sanitize(snapshot) as TradingSnapshotWithSchedule;
  const due = processDueRealizations(sanitized);
  return ensureRealizationSchedule(due);
}

export function loadSnapshot(): TradingSnapshotWithSchedule {
  if (typeof window === "undefined") {
    return ensureRealizationSchedule(cleanBootstrap());
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return ensureRealizationSchedule(cleanBootstrap());
    const parsed = JSON.parse(raw) as TradingSnapshotWithSchedule;
    if (
      parsed.schemaVersion < SCHEMA_VERSION ||
      containsCorruptHistory(parsed)
    ) {
      return ensureRealizationSchedule(cleanBootstrap());
    }
    return hydrateSnapshot(parsed);
  } catch {
    return ensureRealizationSchedule(cleanBootstrap());
  }
}

export function saveSnapshot(snapshot: TradingSnapshot): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export function formatPrice(value: number, symbol: string): string {
  const decimals = symbol.startsWith("SKL") || value < 10 ? 4 : 2;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPnL(value: number): string {
  const formatted = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `−${formatted}`;
  return formatted;
}
