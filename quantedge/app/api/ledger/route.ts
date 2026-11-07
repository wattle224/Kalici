import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UPSTREAMS = [
  "http://127.0.0.1:8000/api/ledger",
  "http://127.0.0.1:8000/ledger",
  "http://127.0.0.1:8000/api/trading",
];

/** Same-origin proxy so the browser never has to call :8000 directly
 *  (avoids CORS / Private Network Access "Failed to fetch" errors). */
async function fetchUpstream(): Promise<Response | null> {
  for (const url of UPSTREAMS) {
    try {
      const res = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) return res;
    } catch {
      /* try next */
    }
  }
  return null;
}

function settledFills(trades: unknown[]) {
  return (trades as { status?: string; executionPrice?: number; quantity?: number; executedAt?: string }[])
    .filter(
      (t) =>
        t.status === "filled" &&
        (t.executionPrice ?? 0) > 0 &&
        (t.quantity ?? 0) > 0
    )
    .sort(
      (a, b) =>
        new Date(b.executedAt ?? 0).getTime() -
        new Date(a.executedAt ?? 0).getTime()
    );
}

function totalRealizedPnL(trades: unknown[]) {
  return (trades as { realizedPnL?: number | null }[]).reduce(
    (s, t) => s + (t.realizedPnL ?? 0),
    0
  );
}

/** Fallback: read backend/data/ledger.json directly if the :8000 process is down. */
function readLedgerFile() {
  const candidates = [
    join(process.cwd(), "..", "backend", "data", "ledger.json"),
    join(process.cwd(), "backend", "data", "ledger.json"),
  ];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    try {
      const snapshot = JSON.parse(readFileSync(path, "utf8")) as {
        trades?: unknown[];
        openPositions?: unknown[];
        pendingAutomations?: unknown[];
        executionState?: string;
      };
      const history = settledFills(snapshot.trades ?? []);
      const realized = totalRealizedPnL(snapshot.trades ?? []);
      return {
        ok: true,
        source: "file",
        snapshot,
        execution: {
          label:
            snapshot.executionState === "running" ? "ONLINE" : "OFFLINE",
          state: snapshot.executionState,
          isOnline: snapshot.executionState === "running",
        },
        executionState: snapshot.executionState,
        openPositions: snapshot.openPositions ?? [],
        tradeHistory: history,
        orders: history,
        pendingAutomations: snapshot.pendingAutomations ?? [],
        totalRealizedPnL: realized,
        realisedPnL: realized,
        note: "Served from backend/data/ledger.json — start the ledger API on :8000 for live updates.",
      };
    } catch {
      /* try next path */
    }
  }
  return null;
}

export async function GET() {
  const upstream = await fetchUpstream();
  if (upstream) {
    const body = await upstream.json();
    return NextResponse.json({ ...body, source: "api:8000" });
  }

  const file = readLedgerFile();
  if (file) {
    return NextResponse.json(file);
  }

  return NextResponse.json(
    {
      ok: false,
      error:
        "Ledger unreachable on :8000 and no backend/data/ledger.json found. Start it with Launch-Investment-Management.bat or npm run ledger.",
    },
    { status: 503 }
  );
}
