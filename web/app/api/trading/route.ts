import { NextResponse } from "next/server";
import {
  cleanBootstrap,
  sanitize,
  settledFills,
  skippedWhilePaused,
  type TradingSnapshot,
} from "@/lib/trading";

let memoryStore: TradingSnapshot = cleanBootstrap();

export async function GET() {
  const history = settledFills(memoryStore.trades);
  const symbols = [...new Set(history.map((t) => t.symbol))].sort();
  return NextResponse.json({
    executionState: memoryStore.executionState,
    openPositions: memoryStore.openPositions,
    tradeHistory: history,
    skippedWhilePaused: skippedWhilePaused(memoryStore.trades),
    symbols,
    note: "Trade history is symbol-agnostic; filters apply to all pairs.",
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { action?: string; snapshot?: TradingSnapshot };
  if (body.action === "clean-restart") {
    memoryStore = cleanBootstrap();
    return NextResponse.json({ ok: true, snapshot: memoryStore });
  }
  if (body.snapshot) {
    memoryStore = sanitize(body.snapshot);
    return NextResponse.json({ ok: true, snapshot: memoryStore });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
