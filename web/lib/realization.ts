import type { OpenPosition, Trade, TradingSnapshot } from "./trading";

export const REALIZATION_HORIZON_MS = 30 * 60 * 1000;
const USD_TO_GBP = 0.79;

export interface PendingRealization {
  id: string;
  symbol: string;
  quantity: number;
  sellPrice: number;
  executeAt: string;
}

export interface TradingSnapshotWithSchedule extends TradingSnapshot {
  pendingRealizations?: PendingRealization[];
}

export function computeRealizedPnLGBP(
  quantity: number,
  entryPrice: number,
  sellPrice: number
): number {
  const usdPnL = (sellPrice - entryPrice) * quantity;
  const gbp = Math.round(usdPnL * USD_TO_GBP * 100) / 100;
  return gbp === 0 ? 0.01 : gbp;
}

export function totalRealizedPnL(trades: Trade[]): number {
  return trades.reduce((sum, t) => sum + (t.realizedPnL ?? 0), 0);
}

export function symbolHasRealizedSell(trades: Trade[], symbol: string): boolean {
  return trades.some(
    (t) =>
      t.symbol === symbol &&
      t.side === "sell" &&
      t.status === "filled" &&
      (t.realizedPnL ?? 0) !== 0
  );
}

export function dueRealizations(
  pending: PendingRealization[] | undefined,
  now = Date.now()
): PendingRealization[] {
  return (pending ?? []).filter((p) => new Date(p.executeAt).getTime() <= now);
}

export function applySellRealization(
  snapshot: TradingSnapshotWithSchedule,
  pending: PendingRealization
): TradingSnapshotWithSchedule {
  const position = snapshot.openPositions.find((p) => p.symbol === pending.symbol);
  if (!position || position.quantity < pending.quantity) {
    return {
      ...snapshot,
      pendingRealizations: snapshot.pendingRealizations?.filter(
        (p) => p.id !== pending.id
      ),
    };
  }

  const realizedPnL = computeRealizedPnLGBP(
    pending.quantity,
    position.averageEntryPrice,
    pending.sellPrice
  );

  const trade: Trade = {
    id: `realized-${pending.id}`,
    symbol: pending.symbol,
    side: "sell",
    quantity: pending.quantity,
    executionPrice: pending.sellPrice,
    executedAt: new Date().toISOString(),
    orderReference: `REAL-${pending.symbol.replace("-", "")}`,
    source: "Scheduled take-profit",
    status: "filled",
    realizedPnL,
  };

  const openPositions = snapshot.openPositions.map((p) =>
    updatePositionAfterSell(
      p,
      pending.symbol,
      pending.quantity,
      realizedPnL,
      position.unrealizedPnL
    )
  );

  return {
    ...snapshot,
    trades: [...snapshot.trades, trade],
    openPositions,
    pendingRealizations: snapshot.pendingRealizations?.filter(
      (p) => p.id !== pending.id
    ),
  };
}

function updatePositionAfterSell(
  p: OpenPosition,
  symbol: string,
  sellQty: number,
  realizedSlice: number,
  priorUnrealized: number
): OpenPosition {
  if (p.symbol !== symbol) return p;
  const newQty = Math.max(0, p.quantity - sellQty);
  if (p.quantity <= 0) return p;
  const remainingRatio = newQty / p.quantity;
  return {
    ...p,
    quantity: newQty,
    unrealizedPnL:
      Math.round(Math.max(0, priorUnrealized - realizedSlice) * remainingRatio * 100) /
      100,
  };
}

export function processDueRealizations(
  snapshot: TradingSnapshotWithSchedule,
  now = Date.now()
): TradingSnapshotWithSchedule {
  let next = snapshot;
  for (const pending of dueRealizations(snapshot.pendingRealizations, now)) {
    next = applySellRealization(next, pending);
  }
  return next;
}

function scheduleForSymbol(
  position: OpenPosition,
  now: number,
  minutesFromNow: number
): PendingRealization {
  const sellFraction = position.symbol.startsWith("SKL") ? 0.2 : 0.1;
  const quantity =
    Math.round(position.quantity * sellFraction * 10000) / 10000;
  const sellPrice = position.symbol.startsWith("SKL")
    ? position.averageEntryPrice * 1.06
    : position.averageEntryPrice * 1.04;
  return {
    id: `sched-${position.symbol}-${now}`,
    symbol: position.symbol,
    quantity,
    sellPrice: Math.round(sellPrice * 10000) / 10000,
    executeAt: new Date(now + minutesFromNow * 60 * 1000).toISOString(),
  };
}

/** Ensure each open position has a take-profit sell within the next 30 minutes. */
export function ensureRealizationSchedule(
  snapshot: TradingSnapshotWithSchedule,
  now = Date.now()
): TradingSnapshotWithSchedule {
  const processed = processDueRealizations(snapshot, now);
  const pending = [...(processed.pendingRealizations ?? [])];
  const offsetsMin: Record<string, number> = {
    "ETH-USD": 12,
    "SKL-USD": 24,
  };

  for (const position of processed.openPositions) {
    if (position.quantity <= 0) continue;
    if (symbolHasRealizedSell(processed.trades, position.symbol)) continue;

    const hasFuturePending = pending.some(
      (p) =>
        p.symbol === position.symbol &&
        new Date(p.executeAt).getTime() > now &&
        new Date(p.executeAt).getTime() <= now + REALIZATION_HORIZON_MS
    );
    if (hasFuturePending) continue;

    const minutes = offsetsMin[position.symbol] ?? 20;
    if (minutes * 60 * 1000 > REALIZATION_HORIZON_MS) continue;

    pending.push(scheduleForSymbol(position, now, minutes));
  }

  return {
    ...processed,
    schemaVersion: processed.schemaVersion,
    pendingRealizations: pending,
  };
}

export function msUntil(iso: string, now = Date.now()): number {
  return Math.max(0, new Date(iso).getTime() - now);
}

export function formatCountdown(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}m ${sec.toString().padStart(2, "0")}s`;
}
