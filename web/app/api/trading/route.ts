import { NextResponse } from "next/server";
import {
  ensureRealizationSchedule,
  processDueRealizations,
  totalRealizedPnL,
  type TradingSnapshotWithSchedule,
} from "@/lib/realization";
import {
  cleanBootstrap,
  hydrateSnapshot,
  settledFills,
  skippedWhilePaused,
} from "@/lib/trading";

let memoryStore: TradingSnapshotWithSchedule = ensureRealizationSchedule(
  cleanBootstrap()
);

function refreshStore(now = Date.now()) {
  memoryStore = ensureRealizationSchedule(
    processDueRealizations(memoryStore, now),
    now
  );
}

export async function GET() {
  refreshStore();
  const history = settledFills(memoryStore.trades);
  const symbols = [...new Set(history.map((t) => t.symbol))].sort();
  return NextResponse.json({
    executionState: memoryStore.executionState,
    openPositions: memoryStore.openPositions,
    tradeHistory: history,
    skippedWhilePaused: skippedWhilePaused(memoryStore.trades),
    pendingRealizations: memoryStore.pendingRealizations ?? [],
    totalRealizedPnL: totalRealizedPnL(memoryStore.trades),
    symbols,
    note: "Take-profit sells schedule within 30 minutes per symbol with non-zero realized P&L.",
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    action?: string;
    snapshot?: TradingSnapshotWithSchedule;
  };
  if (body.action === "clean-restart") {
    memoryStore = ensureRealizationSchedule(cleanBootstrap());
    return NextResponse.json({ ok: true, snapshot: memoryStore });
  }
  if (body.snapshot) {
    memoryStore = hydrateSnapshot(body.snapshot);
    return NextResponse.json({ ok: true, snapshot: memoryStore });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
