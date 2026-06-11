import { activitySummary } from "./automation";
import { getExecutionStatus } from "./executionStatus";
import { hydrateSnapshot } from "./hydrate";
import { totalRealizedPnL } from "./realization";
import {
  cleanBootstrap,
  settledFills,
  skippedWhilePaused,
  type TradingSnapshotWithAutomation,
} from "./trading";

let memoryStore: TradingSnapshotWithAutomation = hydrateSnapshot(
  cleanBootstrap()
);

export function refreshLedgerStore(now = Date.now()): number {
  memoryStore = hydrateSnapshot(memoryStore, now);
  return now;
}

export function getLedgerStore(): TradingSnapshotWithAutomation {
  return memoryStore;
}

export function setLedgerStore(snapshot: TradingSnapshotWithAutomation): void {
  memoryStore = hydrateSnapshot(snapshot);
}

export function resetLedgerStore(): TradingSnapshotWithAutomation {
  memoryStore = hydrateSnapshot(cleanBootstrap());
  return memoryStore;
}

export function buildLedgerResponse(now = Date.now()) {
  refreshLedgerStore(now);
  const history = settledFills(memoryStore.trades);
  const activity = activitySummary(memoryStore.trades, now);
  const execution = getExecutionStatus(
    memoryStore.executionState,
    memoryStore.trades,
    memoryStore.pendingAutomations,
    now
  );
  const realized = totalRealizedPnL(memoryStore.trades);

  return {
    ok: true,
    snapshot: memoryStore,
    execution,
    executionState: memoryStore.executionState,
    openPositions: memoryStore.openPositions,
    tradeHistory: history,
    orders: history,
    last2Hours: activity,
    skippedWhilePaused: skippedWhilePaused(memoryStore.trades),
    pendingAutomations: memoryStore.pendingAutomations ?? [],
    totalRealizedPnL: realized,
    realisedPnL: realized,
    symbols: [...new Set(history.map((t) => t.symbol))].sort(),
  };
}
