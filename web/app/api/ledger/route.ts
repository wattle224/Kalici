import { NextResponse } from "next/server";
import {
  buildLedgerResponse,
  resetLedgerStore,
  setLedgerStore,
} from "@/lib/ledgerServer";
import type { TradingSnapshotWithAutomation } from "@/lib/trading";

export async function GET() {
  return NextResponse.json(buildLedgerResponse());
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    action?: string;
    snapshot?: TradingSnapshotWithAutomation;
  };

  if (body.action === "clean-restart") {
    resetLedgerStore();
    return NextResponse.json(buildLedgerResponse());
  }

  if (body.snapshot) {
    setLedgerStore(body.snapshot);
    return NextResponse.json(buildLedgerResponse());
  }

  return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
}
