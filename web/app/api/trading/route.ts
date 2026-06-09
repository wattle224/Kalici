import { NextResponse } from "next/server";
import { activitySummary } from "@/lib/automation";
import { getExecutionStatus } from "@/lib/executionStatus";
import { hydrateSnapshot } from "@/lib/hydrate";
import { totalRealizedPnL } from "@/lib/realization";
import {
  cleanBootstrap,
  settledFills,
  skippedWhilePaused,
  type TradingSnapshotWithAutomation,
} from "@/lib/trading";

let memoryStore: TradingSnapshotWithAutomation = hydrateSnapshot(
  cleanBootstrap()
);

function refreshStore(now = Date.now()) {
  memoryStore = hydrateSnapshot(memoryStore);
  return now;
}

export async function GET() {
  const now = refreshStore();
  const history = settledFills(memoryStore.trades);
  const activity = activitySummary(memoryStore.trades, now);
  const symbols = [...new Set(history.map((t) => t.symbol))].sort();
  const execution = getExecutionStatus(
    memoryStore.executionState,
    memoryStore.trades,
    memoryStore.pendingAutomations,
    now
  );
  return NextResponse.json({
    execution,
    executionState: memoryStore.executionState,
    openPositions: memoryStore.openPositions,
    tradeHistory: history,
    last2Hours: activity,
    skippedWhilePaused: skippedWhilePaused(memoryStore.trades),
    pendingAutomations: memoryStore.pendingAutomations ?? [],
    totalRealizedPnL: totalRealizedPnL(memoryStore.trades),
    symbols,
    note: "When ONLINE: first buy ~30s, first sell ~90s, then DCA ~8min and take-profit ~12min per symbol.",
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    action?: string;
    snapshot?: TradingSnapshotWithAutomation;
  };
  if (body.action === "clean-restart") {
    memoryStore = hydrateSnapshot(cleanBootstrap());
    return NextResponse.json({ ok: true, snapshot: memoryStore });
  }
  if (body.snapshot) {
    memoryStore = hydrateSnapshot(body.snapshot);
    return NextResponse.json({ ok: true, snapshot: memoryStore });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
