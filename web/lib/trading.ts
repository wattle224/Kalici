export type { TradingSnapshotWithAutomation } from "./automation";
export type { TradingSnapshotWithSchedule } from "./realization";

import { isGbpQuoted } from "./symbols";

export type TradeSide = "buy" | "sell";
export type TradeStatus = "filled" | "skipped" | "pending";
export type OrderType = "MARKET" | "LIMIT";
export type ExecutionState = "running" | "paused";

export interface Trade {
  id: string;
  symbol: string;
  side: TradeSide;
  orderType: OrderType;
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

export const SCHEMA_VERSION = 8;
export const STORAGE_KEY = "kalici.trading.v8";

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

export function isLegacySnapshot(snapshot: TradingSnapshot): boolean {
  if (snapshot.schemaVersion < SCHEMA_VERSION) return true;
  const hasXrp = snapshot.trades.some((t) => t.symbol === "XRP-USD");
  const missingOrderType = snapshot.trades.some(
    (t) => isSettledFill(t) && !("orderType" in t && t.orderType)
  );
  return !hasXrp || missingOrderType;
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

const XRP_LOT = 6.388578;

export function cleanBootstrap(): TradingSnapshot {
  const now = Date.now();
  const buyAt = new Date(now - 3 * 3600_000).toISOString();
  const sellAt = new Date(now - 2.5 * 3600_000).toISOString();
  const buyPrice = 1.1611;
  const sellPrice = 1.1454;
  const realized =
    Math.round((sellPrice - buyPrice) * XRP_LOT * 10000) / 10000;

  return {
    schemaVersion: SCHEMA_VERSION,
    executionState: "running",
    openPositions: [],
    trades: [
      {
        id: "xrp-buy-1",
        symbol: "XRP-USD",
        side: "buy",
        orderType: "MARKET",
        quantity: XRP_LOT,
        executionPrice: buyPrice,
        executedAt: buyAt,
        orderReference: "LOCAL-134807",
        source: "local",
        status: "filled",
        realizedPnL: null,
      },
      {
        id: "xrp-sell-1",
        symbol: "XRP-USD",
        side: "sell",
        orderType: "MARKET",
        quantity: XRP_LOT,
        executionPrice: sellPrice,
        executedAt: sellAt,
        orderReference: "LOCAL-141913",
        source: "local",
        status: "filled",
        realizedPnL: realized,
      },
    ],
  };
}

export function saveSnapshot(snapshot: TradingSnapshot): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export function formatPrice(value: number, symbol: string): string {
  if (isGbpQuoted(symbol)) {
    return formatPriceGBP(value);
  }
  const decimals = symbol.startsWith("SKL") || value < 10 ? 4 : 2;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPriceGBP(value: number, decimals = 4): string {
  return `£${value.toFixed(decimals)}`;
}

export function formatTradeStatus(status: TradeStatus): string {
  if (status === "filled") return "FILLED";
  if (status === "skipped") return "SKIPPED";
  return "PENDING";
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
